// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import React from "react";
import { StyleSheet, View } from "react-native";
import { GUTTER, REGULAR_TEXT } from "../styles";
import { withNavigation, NavigationScreenProp } from "react-navigation";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { connect } from "react-redux";
import { StoreState } from "../../store";
import Text from "./Text";

// This component will render up to this number of tips
const TIP_COUNT = 8;
// This acts as a multiplier for the source part of the text's size relative to the tip itself
const SOURCE_SIZE = 0.8;
const SOURCE_LINE_HEIGHT = 16;

interface State {
  currentText: string | null | undefined;
  currentSource: string | null | undefined;
}

interface Props {
  navigation: NavigationScreenProp<any, any>;
  startTimeConfig: string;
  startTimeMs: number;
  msPerItem: number;
}

class DidYouKnow extends React.Component<Props & WithNamespaces> {
  state = {
    currentText: "",
    currentSource: "",
  };

  _timer: NodeJS.Timeout | undefined;
  _willFocus: any;
  _didFocus: any;
  _willBlur: any;

  componentDidMount() {
    const { navigation } = this.props;
    this._showNextTip();
    this._setTimer();
    this._didFocus = navigation.addListener("didFocus", this._setTimer);
    this._willBlur = navigation.addListener("willBlur", this._clearTimer);
  }

  componentWillUnmount() {
    if (this._willFocus != null) {
      this._willFocus.remove();
      this._willFocus = null;
    }
    this._didFocus.remove();
    this._willBlur.remove();
    this._clearTimer();
  }

  _getCurrentTextNum(): number {
    const { startTimeMs, msPerItem } = this.props;
    return Math.floor(
      ((new Date().getTime() - startTimeMs) / msPerItem) % TIP_COUNT
    );
  }

  _showNextTip = () => {
    if (this.props.navigation.isFocused()) {
      const { t } = this.props;
      const currentTextNum = this._getCurrentTextNum();
      const currentText = t("++tip" + currentTextNum);
      const currentSource = t("++source" + currentTextNum);
      this.setState({ currentText, currentSource });
    }
  };

  _setTimer = () => {
    if (!this._timer && this.props.navigation.isFocused()) {
      const { msPerItem } = this.props;
      this._timer = global.setTimeout(() => {
        this._timer = undefined;
        this._showNextTip();
        this._setTimer();
      }, msPerItem);
    }
  };

  render() {
    return (
      <View style={styles.container}>
        <Text content={this.state.currentText} />
        <Text style={styles.source} content={this.state.currentSource} />
      </View>
    );
  }

  _clearTimer = () => {
    if (this._timer != undefined) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
  };
}

const styles = StyleSheet.create({
  container: {
    marginBottom: GUTTER,
  },
  source: {
    fontSize: REGULAR_TEXT * SOURCE_SIZE,
    lineHeight: SOURCE_LINE_HEIGHT,
  },
});

export default connect((state: StoreState, props: Props & WithNamespaces) => ({
  startTimeMs: state.survey[props.startTimeConfig],
}))(withNavigation(withNamespaces("didYouKnow")(DidYouKnow)));
