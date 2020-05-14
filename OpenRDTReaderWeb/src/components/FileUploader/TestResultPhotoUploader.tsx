// Copyright (c) 2020 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.
import "react-html5-camera-photo/build/css/index.css";

import React, { useCallback, useState } from "react";
import { Theme, createStyles, makeStyles } from "@material-ui/core";

import { Button } from "components/ui/Buttons";
import Divider from "../ui/Divider";
import { FORMID } from "../TestRun/TestRunConstants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Grid from "@material-ui/core/Grid";
import ImageSelectorInput from "./ImageSelectorInput";
import RDTImagePreview from "./RDTImagePreview";
import { ROUTE_DEFINITIONS } from "../../routes/routes";
import { TestRun } from "components/Firebase/FirebaseTypes";
import TestStripCamera from "./TestStripCamera";
import { confirmAlert } from "../../utils/confirmAlert";
import { cx } from "../../style/utils";
import { getAppConfig } from "utils/AppConfig";
import { getFirebaseApp } from "../Firebase/Firebase";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { useHistory } from "react-router-dom";
import { useModelPreLoader } from "./RDTModelLoader";

export const useTestResultPhotoUploaderStyle = makeStyles((theme: Theme) =>
  createStyles({
    imgUploaded: {
      display: "block",
      maxHeight: "400px",
    },
    centeringWrapper: {
      position: "relative",
      textAlign: "center",
    },
    uploadButton: {
      position: "absolute",
      left: "50%",
      top: "10px",
      transform: "translateX(-50%)",
    },
    buttonsOverPic: {
      position: "absolute",
      top: "10px",
      left: 0,
      right: 0,
    },
    buttonsOverPicLeft: {
      textAlign: "right",
    },
    buttonsOverPicRight: {
      textAlign: "left",
    },
    borderImage: {
      display: "inline-block",
      position: "relative",
      "&:after": {
        border: "1px solid rgba(0, 0, 0, .1)",
        bottom: 0,
        content: '" "',
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
      },
    },
    photoUploadBottom: {
      paddingTop: ".75rem",
    },
  })
);

const config = getAppConfig();

interface TestResultPhotoUploaderProps {
  userUID: string;
  testRunUID: string;
  onFileUploadComplete: (ready: boolean) => void;
}

const TestResultPhotoUploader = (props: TestResultPhotoUploaderProps) => {
  const { userUID, testRunUID, onFileUploadComplete } = props;
  const classes = useTestResultPhotoUploaderStyle();
  const history = useHistory();
  const firebaseApp = getFirebaseApp();
  const [testRunDetail] = useDocumentData<TestRun>(
    firebaseApp.getUserTestRunByID({
      userUID: userUID,
      testRunUID: testRunUID,
    })
  );
  // Preload model.
  useModelPreLoader();

  // Show/hide the camera
  const [cameraEnabled, setCameraEnabled] = useState(false);

  // Image upload flow
  const [imageAsFile, setImageAsFile] = useState<File | null>(null);
  // Show the image preview
  const [imageAsURI, setImageAsURI] = useState("");
  // Show the image imageUploaded
  const [imageUploadedURL, setImageUploadedURL] = useState("");
  // Monitors the upload state
  const [isUploading, setIsUploading] = useState(false);

  // Occurs after the user selects a file.
  const handleImageAsFile = useCallback(
    (image: File) => {
      setImageAsFile(image);

      // Show the preview
      setImageAsURI(URL.createObjectURL(image));

      // Reset other data
      setCameraEnabled(false);
      setImageUploadedURL("");

      // Hide the Next button.
      onFileUploadComplete(false);
    },
    [onFileUploadComplete]
  );

  // Occurs when the person chose to use its camera.
  const handleShowCamera = useCallback(() => {
    setCameraEnabled(true);

    // Reset other data
    setImageAsFile(null);
    setImageAsURI("");
    setImageUploadedURL("");

    // Disable the next button.
    onFileUploadComplete(false);
  }, [onFileUploadComplete]);

  // Occurs when a photo is taken.
  const handlePhotoTaken = useCallback((dataURI: string) => {
    setCameraEnabled(false);
    // Show the preview
    setImageAsURI(dataURI);
  }, []);

  const onSubmitForm = useCallback(() => {
    // This is a dummy form, only here to go to the next page.
    history.push(
      ROUTE_DEFINITIONS.TESTRESULT.path.replace(":testRunUID", testRunUID)
    );
  }, [history, testRunUID]);

  // Occurs when the person uploads the photo
  // TODO: Handle Errors
  const handleFireBaseUpload = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.preventDefault();
      setIsUploading(true);
      if (imageAsFile === null && !imageAsURI) {
        console.error(`Cannot upload an empty image.`);
        setIsUploading(false);
        return;
      }
      firebaseApp.uploadPhoto({
        imageAsFile: imageAsFile,
        imageAsURI: imageAsURI,
        testRunUID: testRunUID,
        userUID: userUID,

        onFileUploadComplete: (params: { imgUrl: string }) => {
          // Preload the photo to avoid a jump in the UI
          const imageCache = new Image();
          imageCache.onload = () => {
            // Show the result
            setImageUploadedURL(params.imgUrl);

            // Hide the preview
            setImageAsURI("");
            setIsUploading(false);
            onFileUploadComplete(true);
            onSubmitForm();
          };
          imageCache.src = params.imgUrl;
        },
        onError: (error: Error) => {
          setIsUploading(false);
          confirmAlert("Error uploading your image", "Please try again.");
        },
      });
      const profileUID = testRunDetail?.profileUID;
      profileUID &&
        firebaseApp.addCompletedTestToProfile({
          profileUID,
          testRunUID,
          userUID,
        });
    },
    [
      imageAsFile,
      imageAsURI,
      onFileUploadComplete,
      setIsUploading,
      testRunUID,
      userUID,
      onSubmitForm,
      firebaseApp,
      testRunDetail,
    ]
  );

  return (
    <div>
      {!(cameraEnabled || imageAsURI || imageUploadedURL) && (
        <Grid
          container
          direction="row"
          spacing={1}
          justify="center"
          alignItems="center"
        >
          {config.photoUploadEnabled && (
            <Grid
              item
              xs={12}
              sm={"auto"}
              className={cx({
                [classes.centeringWrapper]: true,
              })}
            >
              <ImageSelectorInput
                onImageSelected={handleImageAsFile}
                disabled={isUploading}
              />
            </Grid>
          )}
          {config.photoUploadEnabled && config.cameraInlineEnabled && (
            <Grid xs={12} sm={2} item>
              <Divider label="OR" isVertical={true} />
            </Grid>
          )}
          {config.cameraInlineEnabled && (
            <Grid
              item
              xs={12}
              sm={"auto"}
              className={cx({
                [classes.centeringWrapper]: true,
              })}
            >
              <Button
                disabled={isUploading}
                onClick={handleShowCamera}
                size="large"
              >
                <span className="icon is-medium">
                  <FontAwesomeIcon icon="camera" />
                </span>
                <span>Take a Photo</span>
              </Button>
            </Grid>
          )}
        </Grid>
      )}
      {(cameraEnabled || imageAsURI || imageUploadedURL) && (
        <div className={cx({ [classes.photoUploadBottom]: true })}>
          {cameraEnabled && <TestStripCamera onPhotoTaken={handlePhotoTaken} />}
          <div
            className={cx({
              [classes.centeringWrapper]: true,
            })}
          >
            {(imageAsURI || imageUploadedURL) && (
              <div className={cx({ [classes.borderImage]: true })}>
                {imageUploadedURL && (
                  <img
                    className={classes.imgUploaded}
                    src={imageUploadedURL}
                    alt="preview"
                  />
                )}
                {imageAsURI && <RDTImagePreview dataURI={imageAsURI} />}
              </div>
            )}
            {imageAsURI && (
              <div className={classes.buttonsOverPic}>
                <Grid container spacing={3}>
                  <Grid item xs={6} className={classes.buttonsOverPicLeft}>
                    <Button
                      disabled={isUploading}
                      onClick={handleFireBaseUpload}
                      size="large"
                    >
                      <span className="icon is-medium">
                        <FontAwesomeIcon icon="cloud-upload-alt" />
                      </span>
                      <span>Upload</span>
                    </Button>
                  </Grid>
                  <Grid item xs={6} className={classes.buttonsOverPicRight}>
                    <Button
                      disabled={isUploading}
                      onClick={handleShowCamera}
                      size="large"
                    >
                      <span className="icon is-medium">
                        <FontAwesomeIcon icon="camera" />
                      </span>
                      <span>Retake</span>
                    </Button>
                  </Grid>
                </Grid>
              </div>
            )}
            {imageUploadedURL && (
              <Button
                className={classes.uploadButton}
                disabled={isUploading}
                form={FORMID}
                size="large"
                type="submit"
              >
                <span>View Results</span>
                <span className="icon is-medium">
                  <FontAwesomeIcon icon="arrow-right" />
                </span>
              </Button>
            )}
          </div>
        </div>
      )}
      <form id={FORMID} onSubmit={onSubmitForm} />
    </div>
  );
};

export default TestResultPhotoUploader;
