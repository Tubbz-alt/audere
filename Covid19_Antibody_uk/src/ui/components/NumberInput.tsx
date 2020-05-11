// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import React from "react";
import { ReturnKeyTypeOptions, StyleProp, TextStyle } from "react-native";
import TextInput from "./TextInput";

interface Props {
  autoFocus?: boolean;
  maxDigits?: number;
  placeholder: string;
  placeholderTextColor?: string;
  returnKeyType: ReturnKeyTypeOptions;
  style?: StyleProp<TextStyle>;
  value?: string | null;
  onEndEditing?: (e: any) => void;
  onChangeText(text: string): void;
  onKeyPress?: (e: any) => void;
  onSubmitEditing?: () => void;
}

interface State {
  text?: string | null;
}

export default class NumberInput extends React.PureComponent<Props, State> {
  textInput = React.createRef<TextInput>();

  constructor(props: Props) {
    super(props);
    this.state = {
      text: props.value,
    };
  }

  static getDerivedStateFromProps(props: Props, state: State) {
    if (props.value !== state.text) {
      return {
        text: props.value,
      };
    }
    return null;
  }

  onChangeText = (text: string) => {
    let newText = text.replace(/[^0-9]/g, "");
    if (!!this.props.maxDigits) {
      newText = newText.substring(0, this.props.maxDigits);
    }
    this.setState({ text: newText });
    this.props.onChangeText(newText);
  };

  render() {
    return (
      <TextInput
        autoCorrect={false}
        autoFocus={this.props.autoFocus}
        keyboardType={"number-pad"}
        placeholder={this.props.placeholder}
        placeholderTextColor={this.props.placeholderTextColor}
        ref={this.textInput}
        returnKeyType={this.props.returnKeyType}
        style={this.props.style}
        value={this.state.text}
        onEndEditing={this.props.onEndEditing}
        onChangeText={this.onChangeText}
        onKeyPress={this.props.onKeyPress}
        onSubmitEditing={this.props.onSubmitEditing}
      />
    );
  }

  focus() {
    this.textInput.current!.focus();
  }
}
