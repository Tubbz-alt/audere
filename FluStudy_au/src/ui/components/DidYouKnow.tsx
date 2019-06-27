// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

import React from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import {
  FONT_NORMAL,
  REGULAR_TEXT,
  TEXT_COLOR,
} from "../styles";
import { withNavigation, NavigationScreenProp } from "react-navigation";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { connect } from "react-redux";
import { StoreState } from "../../store";
import Text from "./Text";

// This component will render up to this number of tips
const TIP_COUNT = 13;
// This acts as a multiplier for the source part of the text's size relative to the tip itself
const SOURCE_SIZE = 0.7;

interface State {
  currentText: string | null | undefined;
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

  componentDidMount() {
    const { t } = this.props;
    this._showNextTip();
    this._setTimer();
  }

  componentWillUnmount() {
    if (this._willFocus != null) {
      this._willFocus.remove();
      this._willFocus = null;
    }
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
      const currentText = t("didYouKnow:tip" + currentTextNum);
      const currentSource = t("didYouKnow:source" + currentTextNum);
      this.setState({ currentText });
      this.setState({ currentSource });
    }
  };

  _setTimer = () => {
    if (!this._timer && this.props.navigation.isFocused()) {
      const { msPerItem } = this.props;
      this._timer = setTimeout(() => {
        this._timer = undefined;
        this._showNextTip();
        this._setTimer();
      }, msPerItem);
    }
  };

  render() {
    return (
      <View>
        <Text
          style={styles.text}
          content={this.state.currentText}
        />
        <Text
          style={styles.source}
          content={this.state.currentSource}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  text: {
    color: TEXT_COLOR,
    fontFamily: FONT_NORMAL,
    fontSize: REGULAR_TEXT,
    lineHeight: 22,
  },
  source: {
    color: TEXT_COLOR,
    fontFamily: FONT_NORMAL,
    fontSize: REGULAR_TEXT*SOURCE_SIZE,
    lineHeight: 22,
  },
});

export default connect((state: StoreState, props: Props & WithNamespaces) => ({
  startTimeMs: state.survey[props.startTimeConfig],
}))(withNavigation(withNamespaces()(DidYouKnow)));
