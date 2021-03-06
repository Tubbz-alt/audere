// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import React from "react";
import {
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import {
  BORDER_RADIUS,
  BORDER_WIDTH,
  BUTTON_WIDTH,
  FONT_SEMI_BOLD,
  GUTTER,
  INPUT_HEIGHT,
  INPUT_TEXT,
  PRIMARY_COLOR,
} from "../styles";

interface Props {
  checked?: boolean;
  enabled: boolean;
  fontSize?: number;
  primary: boolean;
  label: string;
  namespace?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onPress?(event: GestureResponderEvent): void;
}

class Button extends React.Component<Props & WithNamespaces> {
  handlePress = (event: GestureResponderEvent) => {
    this.props.enabled &&
      this.props.onPress != null &&
      this.props.onPress(event);
  };

  render() {
    const { label, namespace, t } = this.props;
    return (
      <TouchableOpacity
        disabled={!this.props.enabled}
        style={[
          styles.button,
          { opacity: this.props.enabled ? 0.95 : 0.5 },
          this.props.primary && styles.primaryButton,
          this.props.style && this.props.style,
        ]}
        onPress={this.handlePress}
      >
        {this.props.checked && (
          <Feather
            name="check"
            color={this.props.primary ? "#FFFFFF" : "#4B2E83"}
            size={20}
            style={styles.check}
          />
        )}
        <Text
          style={[
            styles.text,
            this.props.primary
              ? styles.primaryButtonText
              : styles.secondaryButtonText,
            !!this.props.fontSize && { fontSize: this.props.fontSize },
            this.props.textStyle,
          ]}
          accessibilityLabel={this.props.label.toUpperCase()}
        >
          {(namespace ? t(namespace + ":" + label) : label).toUpperCase()}
        </Text>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: PRIMARY_COLOR,
    borderRadius: BORDER_RADIUS,
    borderWidth: BORDER_WIDTH,
    flexDirection: "row",
    height: INPUT_HEIGHT,
    justifyContent: "center",
    marginBottom: GUTTER * 2,
    width: BUTTON_WIDTH,
  },
  check: {
    paddingRight: GUTTER / 2,
  },
  text: {
    fontFamily: FONT_SEMI_BOLD,
    fontSize: INPUT_TEXT,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  primaryButtonText: {
    color: "white",
  },
  secondaryButtonText: {
    color: PRIMARY_COLOR,
  },
});

export default withNamespaces()(Button);
