// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

import React, { ChangeEvent } from "react";
import { RouteComponentProps, withRouter } from "react-router-dom";
import ExifOrientationImg from "react-exif-orientation-img";

import {
  Diagnosis,
  DocumentType,
  EncounterDocument,
  EncounterTriageDocument,
  EncounterTriageInfo,
  ConditionTag,
  Message,
  NotificationType,
  Notification,
} from "audere-lib/dist/ebPhotoStoreProtocol";
import { getApi, getAuthUser, FirebaseUnsubscriber } from "./api";
import { last, localeDate, triageDocFromTriage } from "./util";
import { Chat } from "./Chat";
import "./PatientDetailPage.css";
import { SimpleMap } from "./SimpleMap";

type TextAreaChangeEvent = ChangeEvent<HTMLTextAreaElement>;

export interface PatientDetailMatchParams {
  docId: string;
}

export interface PatientDetailPageProps
  extends RouteComponentProps<PatientDetailMatchParams> {}

export interface PatientDetailPageState {
  eDoc: EncounterDocument | null;
  tDoc: EncounterTriageDocument | null;
}

class PatientDetailPageAssumeRouter extends React.Component<
  PatientDetailPageProps,
  PatientDetailPageState
> {
  _unsubEncounter: FirebaseUnsubscriber | null = null;
  _unsubTriage: FirebaseUnsubscriber | null = null;

  constructor(props: PatientDetailPageProps) {
    super(props);
    this.state = { eDoc: null, tDoc: null };
    this._triagePane = React.createRef<TriagePane>();
  }

  private _triagePane: React.RefObject<TriagePane>;

  componentDidMount() {
    const sharedDocId = this.props.match.params.docId;

    this.load();
    this._unsubEncounter = getApi().listenForEncounter(sharedDocId, eDoc =>
      this.setState({ eDoc })
    );
    this._unsubTriage = getApi().listenForTriage(sharedDocId, tDoc =>
      this.setState({ tDoc })
    );
  }

  componentWillUnmount() {
    this._unsubEncounter!();
    this._unsubTriage!();
  }

  private load = async (): Promise<void> => {
    const { docId } = this.props.match.params;
    const api = getApi();

    // TODO: show errors
    const [encounter, triage] = await Promise.all([
      api.loadEncounter(docId),
      api.loadTriage(docId),
    ]);
    this.setState({
      eDoc: (encounter.data() as EncounterDocument) || null,
      tDoc: (triage.data() as EncounterTriageDocument) || null,
    });
  };

  triageChangeHandler = async (
    tDoc: EncounterTriageDocument
  ): Promise<void> => {
    if (this.state.eDoc != null) {
      const api = getApi();
      const { eDoc } = this.state;
      const phone = eDoc.encounter.healthWorker.phone;

      console.log(`Triage status changed for document ${eDoc.docId}`);

      const doc = await api.getRegistrationToken(phone);

      if (doc != null && doc.token != null) {
        const details: Notification = {
          documentType: DocumentType.Notification,
          schemaId: 1,
          localIndex: eDoc.encounter.localIndex,
          docId: eDoc.docId,
          notificationType: NotificationType.Diagnosis,
        };

        await api.pushNotification(
          doc.token,
          "Updated EVD diagnosis",
          "A patient's test result interpretation is available",
          details,
          "triage_evd"
        );
      } else {
        console.warn(
          `No registration token found for phone number ${phone}, ` +
            `no notification of triage will be sent`
        );
      }
    }

    this.setState({
      tDoc: tDoc,
    });
  };

  private updateLastViewed(message: Message) {
    if (this._triagePane && this._triagePane.current) {
      this._triagePane.current.updateLastViewed(message.timestamp);
    }
  }

  public render(): React.ReactNode {
    const { eDoc: encounter, tDoc: triage } = this.state;
    return (
      <div className="PatientDetailPage">
        {encounter == null ? (
          <div>Loading...</div>
        ) : (
          <div>
            <PatientInfoPane eDoc={encounter} tDoc={triage} />
            <TestDetailPane eDoc={encounter} tDoc={triage} />
            <TriagePane
              eDoc={encounter}
              tDoc={triage}
              key={JSON.stringify(triage)}
              reload={this.load}
              triageChangedAction={this.triageChangeHandler}
              ref={this._triagePane}
            />
            <PhotoPane eDoc={encounter} tDoc={triage} />
            <Chat
              localIndex={encounter.encounter.localIndex}
              parentDocId={encounter.docId}
              phone={encounter.encounter.healthWorker.phone}
              chwUid={encounter.encounter.healthWorker.uid}
              onNewMessage={this.updateLastViewed}
            />
          </div>
        )}
      </div>
    );
  }
}
export const PatientDetailPage = withRouter(PatientDetailPageAssumeRouter);

interface PatientInfoPaneProps {
  eDoc: EncounterDocument;
  tDoc: EncounterTriageDocument | null;
}

class PatientInfoPane extends React.Component<PatientInfoPaneProps> {
  private renderDiagnosisBubble(diagnosis: Diagnosis) {
    const { value: evdPositive, diagnoser, timestamp } = diagnosis;
    const className = evdPositive ? "Positive" : "Negative";
    const message = evdPositive
      ? "*Likely POSITIVE for Ebola"
      : "*Likely NEGATIVE for Ebola";
    return (
      <div className={`DiagnosisBubble ${className}`}>
        <div className={`Message ${className}`}>{message}</div>
        <div className="Details">
          <div className="Detail">
            Reviewed by: <strong>{diagnoser.name}</strong>
          </div>
          <div className="Detail">
            Date: <strong>{localeDate(timestamp)}</strong>
          </div>
        </div>
      </div>
    );
  }
  public render(): React.ReactNode {
    const { localIndex, patient, notes } = this.props.eDoc.encounter;
    const triaged =
      this.props.tDoc &&
      this.props.tDoc.triage.diagnoses &&
      this.props.tDoc.triage.diagnoses.length > 0;
    const diagnosis = triaged && last(this.props.tDoc!.triage.diagnoses!);
    return (
      <div className="PatientInfoPane">
        <div className="PatientInfoHeader">
          <h2>
            {patient.firstName} {patient.lastName} (ID: {localIndex})
          </h2>
          {diagnosis && this.renderDiagnosisBubble(diagnosis)}
        </div>
        <div>
          <a className="PatientListLink" href={`/patients/`}>
            ← Back to Patient List
          </a>
        </div>
        <h3>Patient Information</h3>
        <table className="DetailTable">
          <tr className="Header">
            <td>Phone</td>
            <td>Contact Details</td>
            <td>CHW Notes</td>
            <td />
          </tr>
          <tr className="Content">
            <td>{patient.phone}</td>
            <td>{patient.details}</td>
            <td>{notes}</td>
            <td />
          </tr>
        </table>
      </div>
    );
  }
}

class TestDetailPane extends React.Component<PatientInfoPaneProps> {
  public render() {
    const { encounter } = this.props.eDoc;
    const photo = last(encounter.rdtPhotos);
    const timestamp = photo ? localeDate(photo.timestamp) : "Not Tested";
    const chwName =
      encounter.healthWorker.firstName + " " + encounter.healthWorker.lastName;
    const { phone, notes } = encounter.healthWorker;

    return (
      <div>
        <h3>Patient Test Detail</h3>
        <table className="DetailTable">
          <tr className="Header">
            <td>Tested on</td>
            <td>Tested by</td>
            <td>Contact info</td>
            <td>About this CHW</td>
          </tr>
          <tr className="Content">
            <td>{timestamp}</td>
            <td>{chwName}</td>
            <td>{phone}</td>
            <td>{notes}</td>
          </tr>
        </table>
      </div>
    );
  }
}

interface TriageProps extends PatientInfoPaneProps {
  reload: () => Promise<void>;
  triageChangedAction: (tDoc: EncounterTriageDocument) => Promise<void>;
}

interface TriageState {
  busy: boolean;
  noteChanged: boolean;
  edited: EncounterTriageInfo;
  error: string | null;
}

class TriagePane extends React.Component<TriageProps, TriageState> {
  constructor(props: TriageProps) {
    super(props);
    const triage = props.tDoc
      ? props.tDoc.triage
      : { notes: "", diagnoses: [], lastViewed: new Date().toISOString() };
    this.state = {
      busy: false,
      noteChanged: false,
      error: null,
      edited: triage,
    };
  }

  componentDidMount() {
    this.save();
  }

  async changeEVD(testIndicatesEVD: boolean) {
    const authUser = await getAuthUser();
    this.setState(
      state => ({
        edited: {
          ...state.edited,
          diagnoses: [
            ...(state.edited.diagnoses || []),
            {
              tag: ConditionTag.Ebola,
              value: testIndicatesEVD,
              diagnoser: authUser,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      }),
      () => this.save()
    );
  }

  onEVDYes = () => this.changeEVD(true);
  onEVDNo = () => this.changeEVD(false);

  onNotesChange = (e: TextAreaChangeEvent) =>
    this.setState({
      edited: {
        ...this.state.edited,
        notes: e.target.value,
      },
      noteChanged: true,
    });

  public updateLastViewed(minTimestamp: string) {
    if (Date.parse(minTimestamp) > Date.parse(this.state.edited.lastViewed)) {
      this.save();
    }
  }

  save = async () => {
    await new Promise(res =>
      this.setState(
        state => ({
          busy: true,
          edited: {
            ...state.edited,
            lastViewed: maxTimestamp(
              state.edited.lastViewed,
              new Date().toISOString()
            ),
          },
        }),
        res
      )
    );
    const { docId } = this.props.eDoc;
    const api = getApi();
    try {
      const updated = triageDocFromTriage(docId, this.state.edited);
      await api.saveTriage(updated);
      await this.props.triageChangedAction(updated);
      this.setState({ busy: false, noteChanged: false });
    } catch (err) {
      this.setState({ busy: false, error: err.message });
    }
  };

  public render(): React.ReactNode {
    const { busy, edited, error, noteChanged } = this.state;
    const diagnosis =
      edited.diagnoses &&
      edited.diagnoses.length >= 1 &&
      edited.diagnoses[edited.diagnoses.length - 1];
    const { notes } = this.state.edited;
    return (
      <div className="TriagePane">
        <h3>Does the below image indicate EVD positivity?</h3>
        <div className="EditDetail">
          <input
            type="button"
            value="YES"
            name="NAME-test-indicates-evd-yes"
            className={
              diagnosis && diagnosis.value ? "evdPressed" : "evdUnpressed"
            }
            disabled={busy}
            onClick={this.onEVDYes}
          />
          <input
            type="button"
            value="NO"
            name="NAME-test-indicates-evd-no"
            className={
              diagnosis && !diagnosis.value ? "evdPressed" : "evdUnpressed"
            }
            disabled={busy}
            onClick={this.onEVDNo}
          />
        </div>
        <div className="triageNotes">
          <textarea
            id="notes"
            disabled={busy}
            value={notes}
            onChange={this.onNotesChange}
            placeholder={"Add additional triage notes here"}
          />
          <input
            type="button"
            value="SAVE"
            className={noteChanged && !busy ? "evdPressed" : "evdUnpressed"}
            disabled={busy || !noteChanged}
            onClick={this.save}
          />
        </div>
        {error != null && <div className="Error">{error}</div>}
      </div>
    );
  }
}

interface PhotoPaneState {
  urls: PhotoFetchResult[];
}

interface PhotoFetchResult {
  url?: string;
  error?: Error;
}

class PhotoPane extends React.Component<PatientInfoPaneProps, PhotoPaneState> {
  constructor(props: PatientInfoPaneProps) {
    super(props);
    this.state = {
      urls: props.eDoc.encounter.rdtPhotos.map(x => ({} as PhotoFetchResult)),
    };

    const { rdtPhotos } = this.props.eDoc.encounter;
    rdtPhotos.forEach(async (photo, i) => {
      const url = await this.getUrl(photo.photoId);
      this.setState(state => {
        const urls = [...state.urls];
        urls.splice(i, 1, url);
        return { urls };
      });
    });
  }

  private async getUrl(photoId: string): Promise<PhotoFetchResult> {
    try {
      return { url: await getApi().photoUrl(photoId) };
    } catch (error) {
      return { error };
    }
  }

  public render(): React.ReactNode {
    const { rdtPhotos } = this.props.eDoc.encounter;
    const { urls } = this.state;
    return (
      <div>
        {rdtPhotos.map((photo, i) => {
          const { url, error } =
            urls[i] ||
            ({ error: new Error(JSON.stringify(urls)) } as PhotoFetchResult);
          return (
            <div className="PhotoPane">
              <table>
                <tr>
                  <td>
                    {url != null && (
                      <div
                        style={{
                          backgroundColor: "gray",
                          marginRight: "1rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <ExifOrientationImg
                          src={url}
                          alt="RDT Result"
                          style={{
                            width: "400px",
                            height: "400px",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                    )}
                  </td>
                  <td>
                    <SimpleMap
                      encounters={[this.props.eDoc]}
                      tDocs={this.props.tDoc ? [this.props.tDoc] : []}
                      style={{
                        height: "400px",
                        width: "400px",
                        marginBottom: "0.5rem",
                      }}
                      zoom={11}
                    />
                    <table>
                      <tr>
                        <th>Test Location:</th>
                      </tr>
                      <tr>
                        <td>
                          {parseFloat(photo.gps.latitude).toFixed(6)},{" "}
                          {parseFloat(photo.gps.longitude).toFixed(6)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              {error != null && <div>ERROR: {error.message}</div>}
            </div>
          );
        })}
      </div>
    );
  }
}

function maxTimestamp(timestamp1: string, timestamp2: string) {
  return Date.parse(timestamp1) > Date.parse(timestamp2)
    ? timestamp1
    : timestamp2;
}
