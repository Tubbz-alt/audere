// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import React from "react";
import {
  KeyboardType,
  ReturnKeyTypeOptions,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import TextInput from "./TextInput";

interface Props {
  autoFocus?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  keyboardType?: KeyboardType;
  maxDigits?: number;
  placeholder: string;
  placeholderTextColor?: string;
  returnKeyType: ReturnKeyTypeOptions;
  textStyle?: StyleProp<TextStyle>;
  value?: string | null;
  onBlur?: () => void;
  onChangeText(text: string): void;
  onFocus?: () => void;
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

  onChangeText = (text: string) => {
    const numbers = "0123456789";
    let newText = text.replace(/[^0-9]/g, "");
    if (!!this.props.maxDigits) {
      newText = newText.substring(0, this.props.maxDigits);
    }
    this.setState({ text: newText });
    this.props.onChangeText(newText);
  };

  render() {
    const { autoFocus, onBlur, onFocus } = this.props;
    return (
      <TextInput
        autoCorrect={false}
        autoFocus={autoFocus}
        containerStyle={this.props.containerStyle}
        keyboardType={
          this.props.keyboardType ? this.props.keyboardType : "number-pad"
        }
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={this.props.placeholder}
        placeholderTextColor={this.props.placeholderTextColor}
        ref={this.textInput}
        returnKeyType={this.props.returnKeyType}
        textStyle={this.props.textStyle}
        value={this.state.text}
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
