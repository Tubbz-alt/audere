import React, { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { connect } from "react-redux";
import { StoreState } from "../../../store";
import { getSelectedButton } from "../../../util/survey";
import {
  NumLinesSeenConfig,
  PinkWhenBlueConfig,
} from "audere-lib/coughQuestionConfig";
import BorderView from "../BorderView";
import { BulletPoint } from "../BulletPoint";
import Divider from "../Divider";
import Text from "../Text";
import {
  getResultRedAnswer,
  getExplanationRedAnswer,
} from "../../../util/fluResults";
import { GUTTER } from "../../styles";

interface Props {
  numLinesAnswer?: string;
  redAnswer?: string;
}

class TestResultRDT extends React.Component<Props & WithNamespaces> {
  _getResult = () => {
    const { numLinesAnswer, redAnswer } = this.props;
    switch (numLinesAnswer) {
      case "twoLines":
        return "positive";
      case "threeLines":
        return "positive";
      case "noneOfTheAbove":
        return getResultRedAnswer(redAnswer);
      default:
        return "negative";
    }
  };

  _getExplanation = () => {
    const { numLinesAnswer, redAnswer } = this.props;
    switch (numLinesAnswer) {
      case "twoLines":
        return "onePinkAndBlue";
      case "threeLines":
        return "onePinkAndBlue";
      case "noneOfTheAbove":
        return getExplanationRedAnswer(redAnswer);
      default:
        return "noPink";
    }
  };

  render() {
    const { t } = this.props;
    return (
      <Fragment>
        <BorderView style={styles.border}>
          <Text
            center={true}
            content={t("common:testResult:" + this._getResult())}
          />
        </BorderView>
        <Text content={t("common:testResult:why")} style={styles.text} />
        <View style={{ marginHorizontal: GUTTER }}>
          <BulletPoint content={t("blueLine")} customBulletUri="listarrow" />
          <BulletPoint
            content={t(this._getExplanation())}
            customBulletUri="listarrow"
          />
        </View>
        <Divider />
        <Text
          content={
            t(`common:testResult:${this._getResult()}WhatToDo`) +
            ` ${t("common:testResult:whatToDoCommon")}`
          }
          style={styles.text}
        />
      </Fragment>
    );
  }
}

export default connect((state: StoreState) => ({
  numLinesAnswer: getSelectedButton(state, NumLinesSeenConfig),
  redAnswer: getSelectedButton(state, PinkWhenBlueConfig),
}))(withNamespaces("TestResultRDT")(TestResultRDT));

const styles = StyleSheet.create({
  border: {
    borderRadius: 10,
    paddingVertical: GUTTER,
    marginHorizontal: GUTTER,
  },
  text: {
    alignSelf: "stretch",
    marginBottom: GUTTER,
    marginHorizontal: GUTTER,
  },
});
