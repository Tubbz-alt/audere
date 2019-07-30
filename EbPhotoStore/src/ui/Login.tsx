import React from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";
import { connect } from "react-redux";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { HealthWorkerInfo } from "audere-lib/ebPhotoStoreProtocol";
import { login, Action, StoreState } from "../store";
import Button from "./components/Button";
import NumberInput from "./components/NumberInput";
import TextInput from "./components/TextInput";
import Text from "./components/Text";
import Title from "./components/Title";
import { GUTTER } from "./styles";

interface Props {
  healthWorkerInfo?: HealthWorkerInfo;
  dispatch(action: Action): void;
}

interface State {
  firstName?: string;
  lastName?: string;
  phone?: string;
  notes: string;
}

class Login extends React.Component<Props & WithNamespaces, State> {
  _firstNameInput: any;
  _phoneInput: any;
  _notesInput: any;

  constructor(props: Props & WithNamespaces) {
    super(props);

    if (props.healthWorkerInfo != null) {
      const { firstName, lastName, phone, notes } = props.healthWorkerInfo;
      this.state = {
        firstName,
        lastName,
        phone,
        notes
      };
    } else {
      this.state = {
        notes: ""
      };
    }

    this._firstNameInput = React.createRef<TextInput>();
    this._phoneInput = React.createRef<NumberInput>();
    this._notesInput = React.createRef<TextInput>();
  }

  _updateLastName = (lastName: string) => {
    this.setState({ lastName });
  };

  _focusFirstName = () => {
    this._firstNameInput.current!.focus();
  };

  _updateFirstName = (firstName: string) => {
    this.setState({ firstName });
  };

  _focusPhone = () => {
    this._phoneInput.current!.focus();
  };

  _updatePhone = (phone: string) => {
    this.setState({ phone });
  };

  _focusNotes = () => {
    this._notesInput.current!.focus();
  };

  _updateNotes = (notes: string) => {
    this.setState({ notes });
  };

  _login = () => {
    this.props.dispatch(
      login({
        lastName: this.state.lastName!,
        firstName: this.state.firstName!,
        phone: this.state.phone!,
        notes: this.state.notes ? this.state.notes : ""
      })
    );
  };

  render() {
    const { t } = this.props;
    const { lastName, firstName, phone, notes } = this.state;
    return (
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <ScrollView style={styles.content}>
          <Title label={t("title")} />
          <Text
            content={t("loginLastName")}
            style={[styles.titleRow, { paddingTop: 0 }]}
          />
          <TextInput
            placeholder={t("lastName")}
            returnKeyType="next"
            style={styles.inputSingle}
            value={lastName}
            onChangeText={this._updateLastName}
            onSubmitEditing={this._focusFirstName}
          />
          <Text content={t("loginFirstName")} style={styles.titleRow} />
          <TextInput
            placeholder={t("firstName")}
            ref={this._firstNameInput}
            returnKeyType="next"
            style={styles.inputSingle}
            value={firstName}
            onChangeText={this._updateFirstName}
            onSubmitEditing={this._focusPhone}
          />
          <Text content={t("loginMobileNumber")} style={styles.titleRow} />
          <NumberInput
            placeholder={t("mobileNumber")}
            ref={this._phoneInput}
            returnKeyType="next"
            style={styles.inputSingle}
            value={phone}
            onChangeText={this._updatePhone}
            onSubmitEditing={this._focusNotes}
          />
          <Text content={t("notes")} style={styles.titleRow} />
          <TextInput
            placeholder=""
            multiline={true}
            numberOfLines={3}
            ref={this._notesInput}
            returnKeyType="done"
            style={styles.inputMulti}
            value={notes}
            onChangeText={this._updateNotes}
          />
        </ScrollView>
        <Button
          enabled={!!lastName && !!firstName && !!phone}
          label={t("login")}
          primary={true}
          style={styles.button}
          onPress={this._login}
        />
      </KeyboardAvoidingView>
    );
  }
}

export default connect((state: StoreState) => ({
  healthWorkerInfo: state.meta.healthWorkerInfo
}))(withNamespaces("login")(Login));

const styles = StyleSheet.create({
  button: {
    alignSelf: "center",
    marginVertical: GUTTER / 2
  },
  container: {
    flex: 1
  },
  content: {
    padding: GUTTER
  },
  titleRow: {
    paddingTop: GUTTER,
    paddingBottom: GUTTER / 4
  },
  inputSingle: {
    marginHorizontal: 0,
    marginVertical: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 1
  },
  inputMulti: {
    borderWidth: 1
  }
});
