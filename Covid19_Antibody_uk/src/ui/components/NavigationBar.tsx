// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import { Feather } from "@expo/vector-icons";
import React from "react";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { NavigationScreenProp, StackActions } from "react-navigation";
import { connect } from "react-redux";
import { Action, StoreState, setDemo } from "../../store";
import {
  GUTTER,
  NAV_BAR_HEIGHT,
  STATUS_BAR_HEIGHT,
  SYSTEM_FONT,
  SYSTEM_TEXT,
} from "../styles";
import Text from "./Text";
import MultiTapContainer from "./MultiTapContainer";

interface Props {
  demoMode?: boolean;
  hideBackButton?: boolean;
  menuItem?: boolean;
  navigation: NavigationScreenProp<any, any>;
  onBack?: (
    nav: NavigationScreenProp<any, any>,
    dispatch: (action: Action) => void
  ) => boolean;
  dispatch(action: Action): void;
}

class NavigationBar extends React.Component<Props & WithNamespaces> {
  shouldComponentUpdate(props: Props & WithNamespaces) {
    return (
      props.demoMode != this.props.demoMode ||
      props.hideBackButton != this.props.hideBackButton ||
      props.menuItem != this.props.menuItem
    );
  }

  _toggleDemoMode = () => {
    this.props.dispatch(setDemo(!this.props.demoMode));
  };

  _debounce = 0;

  _goHome = () => {
    this.props.navigation.navigate("Home");
  };

  _onBack = () => {
    if (this._debounce) {
      return;
    }

    if (!!this.props.onBack) {
      if (!this.props.onBack(this.props.navigation, this.props.dispatch)) {
        return;
      }
    }

    // @ts-ignore
    this._debounce = setTimeout(() => {
      this._debounce = 0;
    }, 400);

    this.props.navigation.dispatch(StackActions.pop({ n: 1 }));
  };

  _onMenu = () => {
    this.props.navigation.openDrawer();
  };

  render() {
    const { demoMode, hideBackButton, menuItem } = this.props;
    return (
      <View style={styles.container}>
        {demoMode && <View style={styles.demoView} />}
        {!!hideBackButton ? (
          <View style={{ width: 30 }} />
        ) : !!menuItem ? (
          <TouchableOpacity
            style={styles.actionContainer}
            onPress={this._goHome}
          >
            <Feather color="white" name="x" size={30} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionContainer}
            onPress={this._onBack}
          >
            <Feather color="white" name="arrow-left" size={30} />
          </TouchableOpacity>
        )}
        <Text
          style={styles.title}
          center={true}
          content={demoMode ? "Demo Mode" : "Antibody Test"}
        />
        <MultiTapContainer
        active={true} 
        taps={3}
        onMultiTap={this._toggleDemoMode}
        >
         <View style={{width: 30, height: 30}} />
      </MultiTapContainer>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  actionContainer: {
    alignItems: "center",
    flexDirection: "row",
  },
  demoView: {
    backgroundColor: "rgba(1, 128, 1, 0.5)",
    paddingTop: STATUS_BAR_HEIGHT,
    position: "absolute",
    top: 0,
    left: 0,
    lineHeight: NAV_BAR_HEIGHT,
    right: 0,
    height: NAV_BAR_HEIGHT + STATUS_BAR_HEIGHT,
  },
  container: {
    alignItems: "center",
    flexDirection: "row",
    height: NAV_BAR_HEIGHT + STATUS_BAR_HEIGHT,
    justifyContent: "space-between",
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: GUTTER / 2,
  },
  title: {
    alignSelf: "center",
    color: "white",
    fontFamily: SYSTEM_FONT,
    fontSize: SYSTEM_TEXT,
    fontWeight: "bold",
  },
});

export default connect((state: StoreState) => ({
  demoMode: state.meta.isDemo,
}))(withNamespaces()(NavigationBar));
