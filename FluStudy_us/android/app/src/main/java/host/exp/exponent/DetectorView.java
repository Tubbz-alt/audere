// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

package host.exp.exponent;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Bitmap.Config;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.RectF;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.Image;
import android.media.ImageReader;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.SystemClock;
import android.os.Trace;
import android.support.v4.app.ActivityCompat;
import android.util.AttributeSet;
import android.util.Log;
import android.util.Size;
import android.view.Surface;
import android.view.WindowManager;
import android.widget.LinearLayout;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.nio.ByteBuffer;
import java.util.LinkedList;
import java.util.List;

import host.exp.exponent.customview.AutoFitTextureView;
import host.exp.exponent.env.ImageUtils;
import host.exp.exponent.tflite.Classifier;
import host.exp.exponent.tracking.InterpretationTracker;
import host.exp.exponent.tracking.RDTTracker;

public class DetectorView extends LinearLayout implements
        ActivityCompat.OnRequestPermissionsResultCallback,
        CameraController.ConnectionCallback {

    private static final String TAG = "DetectorView";

    // Minimum detection confidence to track a detection.
    private static final float BOX_MINIMUM_CONFIDENCE_TF_OD_API = 0.5f;
    private static final float INTERPRETATION_MINIMUM_CONFIDENCE_TF_OD_API = 0.2f;

    private static final int TF_OD_API_INPUT_SIZE = 300;
    private static final boolean MAINTAIN_ASPECT = false;
    private static final Size DESIRED_PREVIEW_SIZE = new Size(720, 1280);

    private static final int PERMISSIONS_REQUEST = 1;
    private static final String PERMISSION_CAMERA = Manifest.permission.CAMERA;
    private static final String READ_STORAGE = Manifest.permission.READ_EXTERNAL_STORAGE;
    private static final String WRITE_STORAGE = Manifest.permission.WRITE_EXTERNAL_STORAGE;

    private static final String RDT_PHOTO_FILE_NAME = "rdt_photo.jpg";
    private static final String RDT_TEST_AREA_PHOTO_FILE_NAME = "rdt_test_area_photo.jpg";

    private MainActivity activity;
    private ResourceLoader resourceLoader;
    private DetectorListener detectorListener;
    private IprdAdapter iprdAdapter;
    private AutoFitTextureView textureView;
    private CameraController cameraController;

    private Handler handler;
    private HandlerThread handlerThread;

    private Classifier boxDetector;
    private Classifier interpretationDetector;

    protected Size previewSize;
    protected Size stillSize;
    private Integer sensorOrientation;
    private int screenHeight;
    private int screenWidth;

    private volatile boolean stillCaptureInProgress = false;

    public DetectorView(Context context, AttributeSet attrs) {
        super(context, attrs);
        if (context instanceof MainActivity) {
            activity = (MainActivity) context;
            activity.addPermissionListener(this);
        } else {
            throw new Error("DetectorView must be created in an activity");
        }
        inflate(context, R.layout.detector_view, this);
        textureView = findViewById(R.id.texture);

        // TODO: move this to background thread and check that it's ready where needed
        resourceLoader = new ResourceLoader(context, activity.getAssets());
        iprdAdapter = new IprdAdapter(resourceLoader.loadIPRDModel());

        boxDetector = resourceLoader.loadPhase1Detector();
        interpretationDetector = resourceLoader.loadPhase2Detector();

        if (hasPermission()) {
            initCameraController();
        } else {
            requestPermission();
        }
    }

    public void setDetectorListener(DetectorListener listener) {
        this.detectorListener = listener;
    }

    public void onPreviewSizeChosen(final Size previewSize, final Size stillSize, final int rotation, boolean supportsTorchMode) {
        this.previewSize = previewSize;
        this.stillSize = stillSize;

        sensorOrientation = rotation - getScreenOrientation();
        screenHeight = getHeight();
        screenWidth = getWidth();

        Log.i(TAG, "Camera orientation relative to screen canvas: " + sensorOrientation);
        Log.i(TAG, "Initializing at preview size " + previewSize.getWidth() + ", " + previewSize.getHeight());
        Log.i(TAG, "Initializing at still size " + stillSize.getWidth() + ", " + stillSize.getHeight());

        detectorListener.onRDTCameraReady(supportsTorchMode, screenWidth, screenHeight);
    }

    protected int getScreenOrientation() {
        switch (activity.getWindowManager().getDefaultDisplay().getRotation()) {
            case Surface.ROTATION_270:
                return 270;
            case Surface.ROTATION_180:
                return 180;
            case Surface.ROTATION_90:
                return 90;
            default:
                return 0;
        }
    }

    protected synchronized void runInBackground(final Runnable r) {
        if (handler != null) {
            handler.post(r);
        }
    }

    public Size getDesiredPreviewFrameSize() {
        return DESIRED_PREVIEW_SIZE;
    }

    private abstract class ImageListener implements ImageReader.OnImageAvailableListener {
        private Runnable imageConverter;
        private Runnable postInferenceCallback;
        protected RDTTracker rdtTracker;

        private boolean isProcessingFrame = false;
        private volatile boolean analyzingFrame = false;

        private byte[] yBytes;
        private byte[] uBytes;
        private byte[] vBytes;

        private int[] rgbBytes = null;

        protected Bitmap boxModelBitmap = null;
        private Matrix imageToModelTransform;
        private Matrix modelToImageTransform;

        protected Bitmap imageBitmap = null;
        protected int imageWidth;
        protected int imageHeight;

        private boolean initialized = false;

        private int[] getRgbBytes() {
            imageConverter.run();
            return rgbBytes;
        }

        private void readyForNextImage() {
            if (postInferenceCallback != null) {
                postInferenceCallback.run();
            }
        }

        private void fillBytes(final Image.Plane[] planes) {
            ByteBuffer yBuffer = planes[0].getBuffer();
            ByteBuffer uBuffer = planes[1].getBuffer();
            ByteBuffer vBuffer = planes[2].getBuffer();

            if (yBytes == null) {
                yBytes = new byte[yBuffer.capacity()];
            }
            if (uBytes == null) {
                uBytes = new byte[uBuffer.capacity()];
            }
            if (vBytes == null) {
                vBytes = new byte[vBuffer.capacity()];
            }
            yBuffer.get(yBytes);
            uBuffer.get(uBytes);
            vBuffer.get(vBytes);
        }


        private void updateBitmaps() {
            imageBitmap.setPixels(getRgbBytes(), 0, imageWidth, 0, 0, imageWidth, imageHeight);
            final Canvas canvas = new Canvas(boxModelBitmap);
            canvas.drawBitmap(imageBitmap, imageToModelTransform, null);
            readyForNextImage();
        }

        protected void initialize() {
            imageBitmap = Bitmap.createBitmap(imageWidth, imageHeight, Config.ARGB_8888);
            boxModelBitmap = Bitmap.createBitmap(TF_OD_API_INPUT_SIZE, TF_OD_API_INPUT_SIZE, Config.ARGB_8888);

            imageToModelTransform =
                    ImageUtils.getTransformationMatrix(
                            imageWidth, imageHeight,
                            TF_OD_API_INPUT_SIZE, TF_OD_API_INPUT_SIZE,
                            sensorOrientation, MAINTAIN_ASPECT);

            modelToImageTransform = new Matrix();
            imageToModelTransform.invert(modelToImageTransform);
            rdtTracker = new RDTTracker(imageWidth, imageHeight, sensorOrientation, screenWidth, screenHeight);
            if (rgbBytes == null) {
                rgbBytes = new int[imageWidth * imageHeight];
            }
            initialized = true;
        }

        @Override
        public void onImageAvailable(ImageReader reader) {
            // We need to wait until we have some size from onPreviewSizeChosen
            if (previewSize == null || stillSize == null) {
                return;
            }

            if (!initialized) {
                initialize();
            }

            if (!resourceLoader.openCVReady()) {
                return;
            }

            if (isProcessingFrame) {
                return;
            }

            try {
                final Image image = reader.acquireLatestImage();

                if (image == null) {
                    return;
                }

                isProcessingFrame = true;

                Trace.beginSection("ImageAvailable");

                final Image.Plane[] planes = image.getPlanes();
                fillBytes(planes);

                imageConverter =
                        new Runnable() {
                            @Override
                            public void run() {
                                ImageUtils.convertYUV420ToARGB8888(
                                        yBytes,
                                        uBytes,
                                        vBytes,
                                        imageWidth,
                                        imageHeight,
                                        planes[0].getRowStride(),
                                        planes[1].getRowStride(),
                                        planes[1].getPixelStride(),
                                        rgbBytes);
                            }
                        };

                postInferenceCallback =
                        new Runnable() {
                            @Override
                            public void run() {
                                image.close();
                                isProcessingFrame = false;
                            }
                        };
                processImage();
            } catch (final Exception e) {
                Log.e(TAG, "Exception in preview onImageAvailable: " + e.toString());
            } finally {
                Trace.endSection(); // ImageAvailable
            }
        }

        protected List<Classifier.Recognition> runPhaseOne() {
            // Local interpretation prototype
            final long boxStartTimeMs = SystemClock.uptimeMillis();

            final List<Classifier.Recognition> results = boxDetector.recognizeImage(boxModelBitmap);
            Log.i(TAG, "Phase 1 processing time: " + (SystemClock.uptimeMillis() - boxStartTimeMs) + "ms");

            return filterResults(BOX_MINIMUM_CONFIDENCE_TF_OD_API, results, true);
        }

        private void processImage() {
            // No mutex needed as this method is not reentrant.
            if (analyzingFrame) {
                readyForNextImage();
                return;
            }
            analyzingFrame = true;

            Trace.beginSection("processImage");

            updateBitmaps();

            runInBackground(
                    new Runnable() {
                        @Override
                        public void run() {
                            Trace.beginSection("Running Process Image");
                            processResult();
                            Trace.endSection(); // Running Process Image
                            // Log.d(TAG, ImageListener.this.getClass().getSimpleName() + " analyzingFrame = false");
                            analyzingFrame = false;
                        }
                    });
            Trace.endSection(); // processPreviewImage
        }

        protected abstract void processResult();

        protected List<Classifier.Recognition> filterResults(
                float minimumConfidence, List<Classifier.Recognition> results, boolean toPreviewTransform) {
            final List<Classifier.Recognition> mappedRecognitions = new LinkedList<Classifier.Recognition>();
            for (final Classifier.Recognition result : results) {
                final RectF location = result.getLocation();
                if (location != null && result.getConfidence() >= minimumConfidence) {

                    if (toPreviewTransform) {
                        modelToImageTransform.mapRect(location);
                        result.setLocation(location);
                    }
                    mappedRecognitions.add(result);
                }
            }
            return mappedRecognitions;
        }

        protected String saveImage(Bitmap bitmap, String filename) {
            File photo = new File(activity.getFilesDir(), filename);
            return saveImage(photo, bitmap);
        }

        int debugImageCounter = 0;
        protected String saveDebugImage(Bitmap bitmap, String description) {
            File debugImages = new File("/sdcard/debug-images");
            debugImages.mkdirs();

            int n = debugImageCounter++;

            File descriptionFile = new File(debugImages, "image" + n + ".txt");
            try (OutputStreamWriter osw = new OutputStreamWriter(new FileOutputStream(descriptionFile.getPath()))) {
                osw.write(description, 0, description.length());
            } catch (java.io.IOException e) {
                Log.e(TAG, "Exception in saveDebugImage", e);
                return null;
            }

            File photoFile = new File(debugImages, "image" + n + ".jpeg");
            return saveImage(photoFile, bitmap);
        }

        protected String saveImage(File file, Bitmap bitmap) {
            if (file.exists()) {
                file.delete();
            }

            try (BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(file.getPath()))) {
                bitmap.compress(Bitmap.CompressFormat.JPEG, 100, bos);
                return Uri.fromFile(new File(file.getPath())).toString();
            } catch (java.io.IOException e) {
                Log.e(TAG, "Exception in saveImage", e);
                return null;
            }
        }
    }

    private class PreviewImageListener extends ImageListener {

        protected void initialize() {
            imageWidth = previewSize.getWidth();
            imageHeight = previewSize.getHeight();
            super.initialize();
        }

        protected void processResult() {
            IprdAdapter.Result iprdResult = iprdAdapter.isSteady(imageBitmap);
            String failureReason = "";
            RDTTracker.RDTPreviewResult rdtResult = null;

            if (iprdResult.isSteady()) {
                List<Classifier.Recognition> mappedRecognitions = runPhaseOne();
                rdtResult = rdtTracker.extractRDTFromPreview(mappedRecognitions, imageBitmap);

                if (rdtResult == null || rdtResult.rdtOutline == null) {
                    Log.d(TAG, "RDT not found in phase 1");
                    failureReason = "(Audere) no strip";
                } else {
                    if (rdtResult.centered) {
                        Log.d(TAG, "RDT found and is centered in phase 1");
                        iprdAdapter.checkFrame(imageBitmap, iprdResult);
                        if (iprdResult.isAccepted()) {
                            if (!stillCaptureInProgress) {
                                failureReason = "Good frame";
                                Log.d(TAG, "Have good preview frame, making single request");
                                stillCaptureInProgress = true;
                                cameraController.captureStill();
                            } else {
                                Log.d(TAG, "Good preview, still already in progress");
                            }
                        } else {
                            Log.d(TAG, "IPRD filter not accepted");
                            failureReason = "(IPRD) ";
                            if (!iprdResult.rdtFound()) {
                                failureReason += "no rdt ";
                            } else {
                                if (!iprdResult.isSharp()) {
                                    failureReason += "not sharp ";
                                } else if (iprdResult.exposureResult() != IprdAdapter.ExposureResult.NORMAL) {
                                    failureReason += "bad exposure";
                                }
                            }
                        }
                    } else {
                        Log.d(TAG, "RDT found but not centered in phase 1");
                        failureReason = "(Audere) strip position";
                    }
                }
            } else {
                Log.d(TAG, "IPRD filter not steady");
                failureReason = "(IPRD) not steady";
            }

            detectorListener.onRDTDetected(iprdResult, rdtResult, failureReason);
        }
    }

    private class StillImageListener extends ImageListener {
        protected void initialize() {
            imageWidth = stillSize.getWidth();
            imageHeight = stillSize.getHeight();
            super.initialize();
        }

        @Override
        protected void processResult() {
            Log.d(TAG, "Processing still frame");
            List<Classifier.Recognition> mappedRecognitions = runPhaseOne();
            RDTTracker.RDTStillFrameResult rdtResult = rdtTracker.extractRDTFromStillFrame(mappedRecognitions, imageBitmap);

            if (rdtResult != null && rdtResult.testArea != null) {
                Log.d(TAG, "Have good still frame (extracted test area), running inference");

                detectorListener.onRDTInterpreting();
                final long interpretationStartTimeMs = SystemClock.uptimeMillis();

                InterpretationResult interpretationResult = InterpretationTracker.interpretResults(filterResults(
                        INTERPRETATION_MINIMUM_CONFIDENCE_TF_OD_API,
                        interpretationDetector.recognizeImage(rdtResult.testArea),
                        false), rdtResult, activity.isDebug());

                Log.i(TAG, "Phase 2 processing time: " + (SystemClock.uptimeMillis() - interpretationStartTimeMs) + "ms");

                interpretationResult.imageUri = saveImage(imageBitmap, RDT_PHOTO_FILE_NAME);
                interpretationResult.resultWindowImageUri = saveImage(rdtResult.testArea, RDT_TEST_AREA_PHOTO_FILE_NAME);

                if (interpretationResult.imageUri != null) {
                    cameraController.onPause();
                    detectorListener.onRDTInterpreted(interpretationResult);
                } else {
                    Log.d(TAG, "Error saving still frame, will try again");
                }
            } else {
                Log.d(TAG, "Still frame didn't have rdt test area");
            }
            stillCaptureInProgress = false;
        }
    }

    private String chooseCamera() {
        final CameraManager manager = (CameraManager) activity.getSystemService(Context.CAMERA_SERVICE);
        try {
            for (final String cameraId : manager.getCameraIdList()) {
                final CameraCharacteristics characteristics = manager.getCameraCharacteristics(cameraId);

                // We don't use a front facing camera in this sample.
                final Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT) {
                    continue;
                }

                final StreamConfigurationMap map =
                        characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);

                if (map == null) {
                    continue;
                }

                return cameraId;
            }
        } catch (CameraAccessException e) {
            Log.e(TAG, "Not allowed to access camera");
        }

        return null;
    }

    private boolean hasPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {

            // Only need storage permissions if this is a debug build
            boolean hasStoragePermission = !activity.isDebug() ||
                    (activity.checkSelfPermission(WRITE_STORAGE) == PackageManager.PERMISSION_GRANTED &&
                            activity.checkSelfPermission(READ_STORAGE) == PackageManager.PERMISSION_GRANTED);

            return activity.checkSelfPermission(PERMISSION_CAMERA) == PackageManager.PERMISSION_GRANTED && hasStoragePermission;
        }
        return true;
    }

    private void requestPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] permissions = activity.isDebug()
                    ? new String[]{ PERMISSION_CAMERA, WRITE_STORAGE, READ_STORAGE }
                    : new String[]{ PERMISSION_CAMERA };
            activity.requestPermissions(permissions, PERMISSIONS_REQUEST);
        }
    }

    protected void initCameraController() {
        String cameraId = chooseCamera();
        cameraController = new CameraController(
                activity,
                textureView,
                this,
                new PreviewImageListener(),
                new StillImageListener(),
                getDesiredPreviewFrameSize());

        cameraController.setCamera(cameraId);
    }

    public synchronized void onResume() {
        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        resourceLoader.onResume();
        handlerThread = new HandlerThread("inference");
        handlerThread.start();
        handler = new Handler(handlerThread.getLooper());
        if (cameraController != null) {
            cameraController.onResume();
        }
    }

    public synchronized void onPause() {
        if (cameraController != null) {
            cameraController.onPause();
        }
        handlerThread.quitSafely();
        handlerThread = null;
        handler = null;
    }

    @Override
    public void onRequestPermissionsResult(
            final int requestCode, final String[] permissions, final int[] grantResults) {
        Log.i(TAG, "onrequest permission result");
        if (requestCode == PERMISSIONS_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // The storage permissions are special for IPRD -- we may have requested them if
                // this is a debug build but we won't bother enforcing that they were granted
                initCameraController();
            } else {
                requestPermission();
            }
        }
    }

    public void setFlashEnabled(boolean flashEnabled) {
        if (cameraController != null) {
            cameraController.setFlashEnabled(flashEnabled);
        }
    }

    public static class InterpretationResult {
        public final RDTTracker.RDTStillFrameResult rdtResult;
        public boolean control;
        public boolean testA;
        public boolean testB;

        public String imageUri;
        public String resultWindowImageUri;

        public final List<Classifier.Recognition> recognitions;

        public String toString() {
            return "control: " + control + ", testA: " + testA + ", testB: " + testB;
        }

        public InterpretationResult(RDTTracker.RDTStillFrameResult rdtResult,
                                    List<Classifier.Recognition> recognitions) {
            this.rdtResult = rdtResult;
            this.recognitions = recognitions;
        }
    }

    public interface DetectorListener {
        void onRDTCameraReady(boolean supportsTorchMode, int screenWidth, int screenHeight);
        void onRDTDetected(
                IprdAdapter.Result iprdResult,
                RDTTracker.RDTResult rdtResult,
                String failureReason
        );
        void onRDTInterpreted(InterpretationResult interpretationResult);
        void onRDTInterpreting();
    }
}
