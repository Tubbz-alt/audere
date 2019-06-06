/*
 * Copyright (C) 2019 University of Washington Ubicomp Lab
 * All rights reserved.
 *
 * This software may be modified and distributed under the terms
 * of a BSD-style license that can be found in the LICENSE file.
 */

package edu.washington.cs.ubicomplab.rdt_reader;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.ImageFormat;
import android.graphics.Matrix;
import android.graphics.RectF;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.CaptureResult;
import android.hardware.camera2.TotalCaptureResult;
import android.hardware.camera2.params.MeteringRectangle;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.Image;
import android.media.ImageReader;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.support.annotation.NonNull;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.text.Html;
import android.util.AttributeSet;
import android.util.Log;
import android.util.Size;
import android.util.SparseIntArray;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import org.opencv.android.BaseLoaderCallback;
import org.opencv.android.LoaderCallbackInterface;

import org.opencv.core.Mat;
import org.opencv.core.MatOfKeyPoint;

import org.opencv.features2d.BFMatcher;
import org.opencv.features2d.BRISK;

import java.io.File;
import java.util.Arrays;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

import host.exp.exponent.R;

import static edu.washington.cs.ubicomplab.rdt_reader.Constants.*;


public class ImageQualityView extends LinearLayout implements View.OnClickListener, ActivityCompat.OnRequestPermissionsResultCallback {
    private ImageProcessor processor;
    private Activity mActivity;
    private State mCurrentState = State.QUALITY_CHECK;
    private ImageQualityViewListener mImageQualityViewListener;
    private boolean openCVLoaded = false;

    private long timeTaken = 0;

    private ViewportUsingBitmap mViewport;

    private FocusState mFocusState = FocusState.INACTIVE;

    private enum State {
        QUALITY_CHECK, FINAL_CHECK
    }

    private enum FocusState {
        INACTIVE, FOCUSING, FOCUSED, UNFOCUSED
    }

    public interface ImageQualityViewListener {
        void onRDTCameraReady();
        void onRDTDetected(
                String img,
                boolean passed,
                boolean center,
                ImageProcessor.SizeResult sizeResult,
                boolean shadow,
                double target,
                boolean sharpness,
                boolean orientation,
                double angle,
                ImageProcessor.ExposureResult exposureResult,
                boolean control,
                boolean testA,
                boolean testB
        );
    }

    //private Activity thisActivity = this;

    public ImageQualityView(Context context, AttributeSet attrs) {
        super(context, attrs);
        Log.i(TAG,"Constructing ImageQualityView");
        inflate(context, R.layout.image_quality_view, this);

        mTextureView = findViewById(R.id.texture);

        timeTaken = System.currentTimeMillis();

        initViews();

    }

    public void setActivity(Activity activity) {
        mActivity = activity;
        if (processor == null && openCVLoaded) {
            processor = ImageProcessor.getInstance(mActivity);
        }
    }

    public void setImageQualityViewListener(ImageQualityViewListener listener) {
        mImageQualityViewListener = listener;
    }

    @Override
    public void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
    }

    /**
     * Conversion from screen rotation to JPEG orientation.
     */
    private static final SparseIntArray ORIENTATIONS = new SparseIntArray();
    private static final int REQUEST_CAMERA_PERMISSION = 1;

    static {
        ORIENTATIONS.append(Surface.ROTATION_0, 90);
        ORIENTATIONS.append(Surface.ROTATION_90, 0);
        ORIENTATIONS.append(Surface.ROTATION_180, 270);
        ORIENTATIONS.append(Surface.ROTATION_270, 180);
    }

    /**
     * Tag for the {@link Log}.
     */
    private static final String TAG = "ImageQualityView";

    /**
     * Camera state: Showing camera preview.
     */
    private static final int STATE_PREVIEW = 0;
    /**
     * ID of the current {@link CameraDevice}.
     */
    private String mCameraId;

    /**
     * A {@link CameraCaptureSession } for camera preview.
     */
    private CameraCaptureSession mCaptureSession;



    /**
     * {@link TextureView.SurfaceTextureListener} handles several lifecycle events on a
     * {@link TextureView}.
     */
    private final TextureView.SurfaceTextureListener mSurfaceTextureListener;

    {
        mSurfaceTextureListener = new TextureView.SurfaceTextureListener() {

            @Override
            public void onSurfaceTextureAvailable(SurfaceTexture texture, int width, int height) {
                Log.i(TAG, "surface texture available");
                openCamera(width, height);
            }

            @Override
            public void onSurfaceTextureSizeChanged(SurfaceTexture texture, int width, int height) {
                configureTransform(width, height);
            }

            @Override
            public boolean onSurfaceTextureDestroyed(SurfaceTexture texture) {
                return true;
            }

            @Override
            public void onSurfaceTextureUpdated(SurfaceTexture texture) {

            }

        };
    }


    /**
     * An {@link AutoFitTextureView} for camera preview.
     */
    private AutoFitTextureView mTextureView;


    /**
     * A reference to the opened {@link CameraDevice}.
     */
    private CameraDevice mCameraDevice;

    /**
     * The {@link android.util.Size} of camera preview.
     */
    private Size mPreviewSize;

    /**
     * {@link CameraDevice.StateCallback} is called when {@link CameraDevice} changes its state.
     */
    private final CameraDevice.StateCallback mStateCallback = new CameraDevice.StateCallback() {

        @Override
        public void onOpened(@NonNull CameraDevice cameraDevice) {
            // This method is called when the camera is opened.  We start camera preview here.
            mCameraOpenCloseLock.release();
            mCameraDevice = cameraDevice;
            createCameraPreviewSession();
        }


        @Override
        public void onDisconnected(@NonNull CameraDevice cameraDevice) {
            mCameraOpenCloseLock.release();
            if (null != cameraDevice && null != mCameraDevice) {
                cameraDevice.close();
                mCameraDevice = null;
            }
            mCameraDevice = null;
        }

        @Override
        public void onError(@NonNull CameraDevice cameraDevice, int error) {
        }

    };

    /**
     * An additional thread for running tasks that shouldn't block the UI.
     */
    private HandlerThread mBackgroundThread;

    /**
     * A {@link Handler} for running tasks in the background.
     */
    private Handler mBackgroundHandler;

    /**
     * An additional thread for running tasks that shouldn't block the UI.
     */
    private HandlerThread mOnImageAvailableThread;

    /**
     * A {@link Handler} for running tasks in the background.
     */
    private Handler mOnImageAvailableHandler;

    /**
     * An {@link ImageReader} that handles still image capture.
     */
    private ImageReader mImageReader;

    final Object focusStateLock = new Object();

    final BlockingQueue<Image> imageQueue = new ArrayBlockingQueue<>(1);

    /**
     * This a callback object for the {@link ImageReader}. "onImageAvailable" will be called when a
     * still image is ready to be saved.
     */
    private final ImageReader.OnImageAvailableListener mOnImageAvailableListener
            = new ImageReader.OnImageAvailableListener() {

        @Override
        public void onImageAvailable(ImageReader reader) {
            if (reader == null) {
                return;
            }

            final Image image = reader.acquireLatestImage();
            Log.d(TAG, "OnImageAvailableListener: image acquired! " + System.currentTimeMillis());
            if (image == null) {
                return;
            }

            if (imageQueue.size() > 0) {
                Log.d(TAG, "OnImageAvailableListener: image closed! " + System.currentTimeMillis());
                image.close();
                return;
            }

            //Log.d(TAG, "LOCAL FOCUS STATE: " + mFocusState + ", " + FocusState.FOCUSED);
            if (mFocusState != FocusState.FOCUSED) {
                image.close();
                return;
            }

            imageQueue.add(image);
            new ImageProcessAsyncTask().execute(image);
        }

    };

    private class ImageProcessAsyncTask extends AsyncTask<Image, Void, Void> {

        @Override
        protected Void doInBackground(Image... images) {
            Image image = images[0];
            final Mat rgbaMat = ImageUtil.imageToRGBMat(image);
            final ImageProcessor.CaptureResult captureResult = processor.captureRDT(rgbaMat);
            //ImageProcessor.SizeResult sizeResult, boolean isCentered, boolean isRightOrientation, boolean isSharp, ImageProcessor.ExposureResult exposureResult
            Log.d(TAG, String.format("Capture time: %d", System.currentTimeMillis() - timeTaken));
            Log.d(TAG, String.format("Captured result: %b", captureResult.allChecksPassed));
            if (captureResult.allChecksPassed) {
                Log.d(TAG, String.format("Captured MAT size: %s", captureResult.resultMat.size()));

                //interpretation
                final ImageProcessor.InterpretationResult interpretationResult = processor.interpretResult(captureResult.resultMat);

                if (interpretationResult.control) {
                    mActivity.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            moveToResultActivity(captureResult.resultMat, interpretationResult.resultMat,
                                    interpretationResult.control, interpretationResult.testA, interpretationResult.testB);
                        }
                    });
                } else {
                    imageQueue.remove();
                    image.close();
                }
                if (mImageQualityViewListener != null) {
                    mImageQualityViewListener.onRDTDetected(
                            ImageUtil.matToBase64(captureResult.resultMat),
                            captureResult.allChecksPassed && interpretationResult.control,
                            captureResult.isCentered,
                            captureResult.sizeResult,
                            captureResult.isShadow,
                            0,
                            captureResult.isSharp,
                            captureResult.isRightOrientation,
                            captureResult.angle,
                            captureResult.exposureResult,
                            interpretationResult.control,
                            interpretationResult.testA,
                            interpretationResult.testB
                    );
                }

            } else {
                if (mImageQualityViewListener != null) {
                    mImageQualityViewListener.onRDTDetected(
                            ImageUtil.matToBase64(captureResult.resultMat),
                            captureResult.allChecksPassed,
                            captureResult.isCentered,
                            captureResult.sizeResult,
                            captureResult.isShadow,
                            0,
                            captureResult.isSharp,
                            captureResult.isRightOrientation,
                            captureResult.angle,
                            captureResult.exposureResult,
                            false,
                            false,
                            false
                    );
                }

                imageQueue.remove();
                image.close();
            }
            return null;

        }
    }

    private void moveToResultActivity(Mat captureMat, Mat windowMat, boolean control, boolean testA, boolean testB) {
        mOnImageAvailableThread.interrupt();
    }

    /**
     * {@link CaptureRequest.Builder} for the camera preview
     */
    private CaptureRequest.Builder mPreviewRequestBuilder;

    /**
     * {@link CaptureRequest} generated by {@link #mPreviewRequestBuilder}
     */
    private CaptureRequest mPreviewRequest;


    /**
     * A {@link Semaphore} to prevent the app from exiting before closing the camera.
     */
    private Semaphore mCameraOpenCloseLock = new Semaphore(1);

    /**
     * A {@link CameraCaptureSession.CaptureCallback} that handles events related to JPEG capture.
     */

    private int counter = 0;
    private CameraCaptureSession.CaptureCallback mCaptureCallback
            = new CameraCaptureSession.CaptureCallback() {

        private void process(CaptureResult result) {
            synchronized (focusStateLock) {
                FocusState previousFocusState = mFocusState;
                if (result.get(CaptureResult.CONTROL_AF_MODE) == null || result.get(CaptureResult.CONTROL_AF_STATE) == null) {
                    //Log.d(TAG, "FOCUS STATE: is null");
                    return;
                }
                if (result.get(CaptureResult.CONTROL_AF_MODE) == CaptureResult.CONTROL_AF_MODE_CONTINUOUS_PICTURE) {
                    if (result.get(CaptureResult.CONTROL_AF_STATE) == CaptureResult.CONTROL_AF_STATE_PASSIVE_FOCUSED) {
                        //Log.d(TAG, "FOCUS STATE: focused");
                        mFocusState = FocusState.FOCUSED;
                    } else if (result.get(CaptureResult.CONTROL_AF_STATE) == CaptureResult.CONTROL_AF_STATE_PASSIVE_UNFOCUSED) {
                        //Log.d(TAG, "FOCUS STATE: unfocused");
                        mFocusState = FocusState.UNFOCUSED;
                    } else if (result.get(CaptureResult.CONTROL_AF_STATE) == CaptureResult.CONTROL_AF_STATE_INACTIVE) {
                        //Log.d(TAG, "FOCUS STATE: inactive");
                        mFocusState = FocusState.INACTIVE;
                    } else if (result.get(CaptureResult.CONTROL_AF_STATE) == CaptureResult.CONTROL_AF_STATE_PASSIVE_SCAN) {
                        //Log.d(TAG, "FOCUS STATE: focusing");
                        mFocusState = FocusState.FOCUSING;
                    } else {
                        //Log.d(TAG, "FOCUS STATE: unknown state " + result.get(CaptureResult.CONTROL_AF_STATE).toString());
                    }
                }
            }

            if (!Build.MODEL.equals("TECNO-W3")) {
                if (counter++ % 10 == 0)
                    updateRepeatingRequest();
            }
        }

        @Override
        public void onCaptureProgressed(@NonNull CameraCaptureSession session,
                                        @NonNull CaptureRequest request,
                                        @NonNull CaptureResult partialResult) {
            process(partialResult);
        }

        @Override
        public void onCaptureCompleted(@NonNull CameraCaptureSession session,
                                       @NonNull CaptureRequest request,
                                       @NonNull TotalCaptureResult result) {
            process(result);
        }

    };

    /**
     * Shows a {@link Toast} on the UI thread.
     *
     * @param text The message to show
     */
    private void showToast(final String text) {
        if (mActivity != null) {
            mActivity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(mActivity, text, Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        startBackgroundThread();
        Log.i(TAG, "onAttachedToWindow");
        Log.i(TAG, "width: " + getWidth());
        Log.i(TAG, "height: " + getHeight());


        // When the screen is turned off and turned back on, the SurfaceTexture is already
        // available, and "onSurfaceTextureAvailable" will not be called. In that case, we can open
        // a camera and start preview from here (otherwise, we wait until the surface is ready in
        // the SurfaceTextureListener).
        if (mTextureView.isAvailable()) {
            Log.i(TAG, "mTextureView is available");
            openCamera(mTextureView.getWidth(), mTextureView.getHeight());
        } else {
            Log.i(TAG, "mTextureView is not available");
            mTextureView.setSurfaceTextureListener(mSurfaceTextureListener);
            ImageProcessor.loadOpenCV(getContext(), mLoaderCallback);
        }

    }

    @Override
    public void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        Log.i(TAG, "onDetachedFromWindow");



        closeCamera();
        stopBackgroundThread();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        if (requestCode == REQUEST_CAMERA_PERMISSION) {
            if (grantResults.length != 1 || grantResults[0] != PackageManager.PERMISSION_GRANTED) {
                showToast("This App requires permission to use your camera.");
            }
        }
    }

    /**
     * Sets up member variables related to camera.
     *
     * @param width  The width of available size for camera preview
     * @param height The height of available size for camera preview
     */
    private void setUpCameraOutputs(int width, int height) {
        CameraManager manager = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
        try {
            for (String cameraId : manager.getCameraIdList()) {
                CameraCharacteristics characteristics
                        = manager.getCameraCharacteristics(cameraId);

                // We don't use a front facing camera in this sample.
                Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT) {
                    continue;
                }

                StreamConfigurationMap map = characteristics.get(
                        CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
                if (map == null) {
                    continue;
                }

                // choose optimal size
                Size closestPreviewSize = new Size(Integer.MAX_VALUE, (int) (Integer.MAX_VALUE * (9.0 / 16.0)));
                Size closestImageSize = new Size(Integer.MAX_VALUE, (int) (Integer.MAX_VALUE * (9.0 / 16.0)));
                for (Size size : Arrays.asList(map.getOutputSizes(ImageFormat.YUV_420_888))) {
                    Log.d(TAG, "Available Sizes: " + size.toString());
                    if (size.getWidth() * 9 == size.getHeight() * 16) { //Preview surface ratio is 16:9
                        double currPreviewDiff = (CAMERA2_PREVIEW_SIZE.height * CAMERA2_PREVIEW_SIZE.width) - closestPreviewSize.getHeight() * closestPreviewSize.getWidth();
                        double newPreviewDiff = (CAMERA2_PREVIEW_SIZE.height * CAMERA2_PREVIEW_SIZE.width) - size.getHeight() * size.getWidth();

                        double currImageDiff = (CAMERA2_IMAGE_SIZE.height * CAMERA2_IMAGE_SIZE.width) - closestImageSize.getHeight() * closestImageSize.getWidth();
                        double newImageDiff = (CAMERA2_IMAGE_SIZE.height * CAMERA2_IMAGE_SIZE.width) - size.getHeight() * size.getWidth();

                        if (Math.abs(currPreviewDiff) > Math.abs(newPreviewDiff)) {
                            closestPreviewSize = size;
                        }

                        if (Math.abs(currImageDiff) > Math.abs(newImageDiff)) {
                            closestImageSize = size;
                        }
                    }
                }

                Log.d(TAG, "Selected sizes: " + closestPreviewSize.toString() + ", " + closestImageSize.toString());

                mPreviewSize = closestPreviewSize;
                mImageReader = ImageReader.newInstance(closestImageSize.getWidth(), closestImageSize.getHeight(),
                        ImageFormat.YUV_420_888, /*maxImages*/5);
                mImageReader.setOnImageAvailableListener(
                        mOnImageAvailableListener, mOnImageAvailableHandler);

                CAMERA2_IMAGE_SIZE.width = closestImageSize.getWidth();
                CAMERA2_IMAGE_SIZE.height = closestImageSize.getHeight();

                CAMERA2_PREVIEW_SIZE.width = closestPreviewSize.getWidth();
                CAMERA2_PREVIEW_SIZE.height = closestPreviewSize.getHeight();

                // We fit the aspect ratio of TextureView to the size of preview we picked.
                int orientation = getResources().getConfiguration().orientation;
                if (orientation == Configuration.ORIENTATION_LANDSCAPE) {
                    mTextureView.setAspectRatio(
                            mPreviewSize.getWidth(), mPreviewSize.getHeight());
                } else {
                    mTextureView.setAspectRatio(
                            mPreviewSize.getHeight(), mPreviewSize.getWidth());
                }

                mCameraId = cameraId;
                return;
            }
        } catch (CameraAccessException e) {
            e.printStackTrace();
        } catch (NullPointerException e) {
            // Currently an NPE is thrown when the Camera2API is used but not supported on the
            // device this code runs.
            showToast("Unable to open the camera.");
        }
    }

    private void requestCameraPermission() {
        ActivityCompat.requestPermissions(mActivity, new String[]{Manifest.permission.CAMERA}, MY_PERMISSION_REQUEST_CODE);
    }

    /**
     * Opens the camera specified by {@link #mCameraId}.
     */
    private void openCamera(int width, int height) throws SecurityException {
        Log.i(TAG, "openCamera");
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            requestCameraPermission();
            return;
        }

        setUpCameraOutputs(width, height);
        configureTransform(width, height);
        Context activity = getContext();
        CameraManager manager = (CameraManager) activity.getSystemService(Context.CAMERA_SERVICE);
        try {
            if (!mCameraOpenCloseLock.tryAcquire(2500, TimeUnit.MILLISECONDS)) {
                throw new RuntimeException("Time out waiting to lock camera opening.");
            }
            manager.openCamera(mCameraId, mStateCallback, mBackgroundHandler);
        } catch (CameraAccessException e) {
            e.printStackTrace();
        } catch (InterruptedException e) {
            throw new RuntimeException("Interrupted while trying to lock camera opening.", e);
        }
    }

    /**
     * Closes the current {@link CameraDevice}.
     */
    private void closeCamera() {
        try {
            mCameraOpenCloseLock.acquire();
            if (null != mCaptureSession) {
                mCaptureSession.close();
                mCaptureSession = null;
            }
            if (null != mCameraDevice) {
                mCameraDevice.close();
                mCameraDevice = null;
            }
            if (null != mImageReader) {
                mImageReader.close();
                mImageReader = null;
            }
        } catch (InterruptedException e) {
            throw new RuntimeException("Interrupted while trying to lock camera closing.", e);
        } finally {
            mCameraOpenCloseLock.release();
        }
    }

    /**
     * Starts a background thread and its {@link Handler}.
     */
    private void startBackgroundThread() {
        mBackgroundThread = new HandlerThread("CameraBackground");
        mBackgroundThread.start();
        mBackgroundHandler = new Handler(mBackgroundThread.getLooper());

        mOnImageAvailableThread = new HandlerThread("OnImageAvailableBackgroud");
        mOnImageAvailableThread.start();
        mOnImageAvailableHandler = new Handler(mOnImageAvailableThread.getLooper());
    }

    /**
     * Stops the background thread and its {@link Handler}.
     */
    private void stopBackgroundThread() {
        Log.d(TAG, "Thread Quit Safely.");
        mBackgroundThread.quit();
        mOnImageAvailableThread.quit();
        try {
            mBackgroundThread.join();
            mBackgroundThread = null;
            mBackgroundHandler = null;

            mOnImageAvailableThread.join();
            mOnImageAvailableThread = null;
            mOnImageAvailableHandler = null;
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    private CameraCaptureSession.StateCallback mCameraCaptureSessionStateCallback = new CameraCaptureSession.StateCallback() {

        @Override
        public void onConfigured(@NonNull CameraCaptureSession cameraCaptureSession) {
            // The camera is already closed
            if (null == mCameraDevice) {
                return;
            }
            mCaptureSession = cameraCaptureSession;

            mImageQualityViewListener.onRDTCameraReady();

            updateRepeatingRequest();
        }

        @Override
        public void onConfigureFailed(
                @NonNull CameraCaptureSession cameraCaptureSession) {
            showToast("Unable to open the camera.");
        }
    };

    private int mCounter = Integer.MIN_VALUE;

    private void updateRepeatingRequest() {
        // When the session is ready, we start displaying the preview.
        try {
            CameraManager manager = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
            CameraCharacteristics characteristics = manager.getCameraCharacteristics(mCameraId);


            final android.graphics.Rect sensor = characteristics.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE);
            Log.d(TAG, "Sensor size: " + sensor.width() + ", " + sensor.height());
            MeteringRectangle mr = new MeteringRectangle(sensor.width() / 2 - 50, sensor.height() / 2 - 50, 100 + (mCounter % 2), 100 + (mCounter % 2),
                    MeteringRectangle.METERING_WEIGHT_MAX - 1);

            Log.d(TAG, String.format("Sensor Size (%d, %d), Metering %s", sensor.width(), sensor.height(), mr.toString()));
            Log.d(TAG, String.format("Regions AE %s", characteristics.get(CameraCharacteristics.CONTROL_MAX_REGIONS_AE).toString()));

            mPreviewRequestBuilder.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
            mPreviewRequestBuilder.set(CaptureRequest.CONTROL_AF_REGIONS,
                    new MeteringRectangle[]{mr});
            mPreviewRequestBuilder.set(CaptureRequest.CONTROL_AE_MODE, CaptureRequest.CONTROL_AE_MODE_ON);
            mPreviewRequestBuilder.set(CaptureRequest.CONTROL_AE_REGIONS,
                    new MeteringRectangle[]{mr});
            mPreviewRequestBuilder.set(CaptureRequest.CONTROL_AWB_MODE, CaptureRequest.CONTROL_AWB_MODE_AUTO);
            mPreviewRequestBuilder.set(CaptureRequest.CONTROL_AWB_REGIONS,
                    new MeteringRectangle[]{mr});

            mPreviewRequestBuilder.set(CaptureRequest.FLASH_MODE, CaptureRequest.FLASH_MODE_TORCH);
            mPreviewRequest = mPreviewRequestBuilder.build();

            try {
                mCameraOpenCloseLock.acquire();
                if (mCaptureSession != null) {
                    mCaptureSession.setRepeatingRequest(mPreviewRequest,
                            mCaptureCallback, mBackgroundHandler);
                }
            } catch (InterruptedException e) {
                throw new RuntimeException("Interrupted while trying to lock camera closing.", e);
            } finally {
                mCameraOpenCloseLock.release();
            }

            mCounter++;
        } catch (CameraAccessException e) {
            e.printStackTrace();
        }
    }


    /**
     * Creates a new {@link CameraCaptureSession} for camera preview.
     */
    private void createCameraPreviewSession() {
        try {
            SurfaceTexture texture = mTextureView.getSurfaceTexture();
            mTextureView.setOpaque(false);
            assert texture != null;

            // We configure the size of default buffer to be the size of camera preview we want.
            texture.setDefaultBufferSize(mPreviewSize.getWidth(), mPreviewSize.getHeight());

            // This is the output Surface we need to start preview.
            Surface surface = new Surface(texture);
            Surface mImageSurface = mImageReader.getSurface();


            // We set up a CaptureRequest.Builder with the output Surface.
            mPreviewRequestBuilder
                    = mCameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);


            mPreviewRequestBuilder.addTarget(surface);
            mPreviewRequestBuilder.addTarget(mImageSurface);


            // Here, we create a CameraCaptureSession for camera preview.
            mCameraDevice.createCaptureSession(Arrays.asList(surface, mImageReader.getSurface()),
                    mCameraCaptureSessionStateCallback, null
            );
        } catch (CameraAccessException e) {
            e.printStackTrace();
        }
    }

    /**
     * Configures the necessary {@link android.graphics.Matrix} transformation to `mTextureView`.
     * This method should be called after the camera preview size is determined in
     * setUpCameraOutputs and also the size of `mTextureView` is fixed.
     *
     * @param viewWidth  The width of `mTextureView`
     * @param viewHeight The height of `mTextureView`
     */
    private void configureTransform(int viewWidth, int viewHeight) {
        Context activity = getContext();
        if (null == mTextureView || null == mPreviewSize || null == activity) {
            return;
        }
        int rotation = 0; // activity.getWindowManager().getDefaultDisplay().getRotation();
        Matrix matrix = new Matrix();
        RectF viewRect = new RectF(0, 0, viewWidth, viewHeight);
        RectF bufferRect = new RectF(0, 0, mPreviewSize.getHeight(), mPreviewSize.getWidth());
        float centerX = viewRect.centerX();
        float centerY = viewRect.centerY();
        if (Surface.ROTATION_90 == rotation || Surface.ROTATION_270 == rotation) {
            bufferRect.offset(centerX - bufferRect.centerX(), centerY - bufferRect.centerY());
            matrix.setRectToRect(viewRect, bufferRect, Matrix.ScaleToFit.FILL);
            float scale = Math.max(
                    (float) viewHeight / mPreviewSize.getHeight(),
                    (float) viewWidth / mPreviewSize.getWidth());
            matrix.postScale(scale, scale, centerX, centerY);
            matrix.postRotate(90 * (rotation - 2), centerX, centerY);
        } else if (Surface.ROTATION_180 == rotation) {
            matrix.postRotate(180, centerX, centerY);
        }
        mTextureView.setTransform(matrix);
    }


    @Override
    public void onClick(View view) {
        switch (view.getId()) {
            case R.id.img_quality_check_viewport: {
                updateRepeatingRequest();
                break;
            }
        }
    }


    /**
     * Imported from ImageQualityOpencvActivity
     **/


    private BaseLoaderCallback mLoaderCallback = new BaseLoaderCallback(getContext()) {
        @Override
        public void onManagerConnected(int status) {
            switch (status) {
                case LoaderCallbackInterface.SUCCESS: {
                    Log.i(TAG, "OpenCV loaded successfully");
                    if (mActivity != null) {
                        processor = ImageProcessor.getInstance(mActivity);
                    }
                    openCVLoaded = true;
                }
                break;
                default: {
                    super.onManagerConnected(status);
                }
                break;
            }
        }
    };

    private void initViews() {
        mViewport = findViewById(R.id.img_quality_check_viewport);
        mViewport.setVisibility(GONE);
    }
}
