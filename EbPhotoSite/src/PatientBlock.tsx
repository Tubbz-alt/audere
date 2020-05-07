// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import React, { MouseEvent } from "react";

import {
  EncounterDocument,
  EncounterTriageDocument,
} from "audere-lib/dist/ebPhotoStoreProtocol";
import "./PatientList.css";
import mapIcon from "./img/mapview.png";
import listIcon from "./img/listview.png";
import PatientTable from "./PatientTable";
import { EncounterMap } from "./EncounterMap";
import { WithNamespaces, withNamespaces } from "react-i18next";

interface Props {
  headerLabel: string;
  eDocs: EncounterDocument[];
  tDocs: EncounterTriageDocument[];
  chatsUpdatedAt: { [eDocId: string]: string };
  onSelectRow: (e: MouseEvent, eDoc: EncounterDocument) => void;
  showEvdResultColumns: boolean;
}

interface State {
  showMap: boolean;
}

class PatientBlock extends React.Component<Props & WithNamespaces, State> {
  state: State = {
    showMap: false,
  };

  _onShowList = () => {
    this.setState({ showMap: false });
  };

  _onShowMap = () => {
    this.setState({ showMap: true });
  };

  _renderListHeader() {
    const { t } = this.props;
    return (
      <table className="PatientTableTitle">
        <thead>
          <tr>
            <td>{this.props.headerLabel}</td>
            <td className="ListViewIcon">
              <div className="viewButton" onClick={this._onShowList}>
                <img src={listIcon} alt="listIcon" onClick={this._onShowList} />
                <div className="ListViewText">{t("listView")}</div>
              </div>
            </td>

            <td className="MapViewIcon">
              <div className="viewButton" onClick={this._onShowMap}>
                <img src={mapIcon} alt="mapIcon" onClick={this._onShowMap} />
                <div className="MapViewText">{t("mapView")}</div>
              </div>
            </td>
          </tr>
        </thead>
      </table>
    );
  }

  render() {
    const mainView = this.state.showMap ? (
      <EncounterMap
        encounters={this.props.eDocs}
        tDocs={this.props.tDocs}
        style={{ height: "25rem" }}
        zoom={6}
      />
    ) : (
      <PatientTable
        eDocs={this.props.eDocs}
        tDocs={this.props.tDocs}
        chatsUpdatedAt={this.props.chatsUpdatedAt}
        onSelect={this.props.onSelectRow}
        showEvdResultColumns={this.props.showEvdResultColumns}
      />
    );
    return (
      <div>
        {this._renderListHeader()}
        {mainView}
      </div>
    );
  }
}

export default withNamespaces("patientBlock")(PatientBlock);
