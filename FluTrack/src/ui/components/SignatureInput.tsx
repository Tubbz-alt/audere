// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { WithNamespaces, withNamespaces } from "react-i18next";
import Button from "./Button";
import SignatureBox from "./SignatureBox";
import {
  ConsentInfo,
  ConsentInfoSignerType,
} from "audere-lib/snifflesProtocol";

interface Props {
  consent?: ConsentInfo;
  editableNames: boolean;
  participantName?: string;
  relation?: string;
  signerName?: string;
  signerType: ConsentInfoSignerType;
  onSubmit(
    name: string,
    signerType: ConsentInfoSignerType,
    signerName: string,
    signature: string,
    relation?: string
  ): void;
}

interface State {
  open: boolean;
}

class SignatureInput extends React.Component<Props & WithNamespaces> {
  state: State = {
    open: false,
  };

  _signed = (): boolean => {
    return (
      !!this.props.consent &&
      this.props.consent.signerType === this.props.signerType
    );
  };

  render() {
    const { t } = this.props;
    return (
      <View style={styles.container}>
        <Button
          checked={this._signed()}
          enabled={true}
          label={t(this.props.signerType)}
          primary={false}
          onPress={() => {
            this.setState({ open: true });
          }}
        />
        <SignatureBox
          editableNames={this.props.editableNames}
          open={this.state.open}
          signer={this.props.signerType}
          participantName={this.props.participantName}
          relation={this.props.relation}
          signerName={this.props.signerName}
          label={t(this.props.signerType)}
          onDismiss={() => this.setState({ open: false })}
          onSubmit={(
            name: string,
            signerName: string,
            signature: string,
            relation?: string
          ) => {
            this.props.onSubmit(
              name,
              this.props.signerType,
              signerName,
              signature,
              relation
            );
            this.setState({ open: false });
          }}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    alignSelf: "stretch",
  },
});

export default withNamespaces("signatureInput")(SignatureInput);
