import React from "react";
import { NavigationScreenProp } from "react-navigation";
import { connect } from "react-redux";
import { StoreState } from "../../../store/index";
import { Action, setBloodCollection } from "../../../store";
import OptionList from "../experiment/components/OptionList";
import EditSettingButton from "./components/EditSettingButton";
import KeyValueLine from "./components/KeyValueLine";
import { Text, StyleSheet } from "react-native";
import ScreenContainer from "../experiment/components/ScreenContainer";

interface Props {
  location: string;
  bloodCollection: boolean;
  dispatch(action: Action): void;
  navigation: NavigationScreenProp<any, any>;
  screenProps: any;
}

function getTodaysDate(): string {
  return new Date().toLocaleDateString();
}

@connect((state: StoreState) => ({
  location: state.admin == null ? null : state.admin.location,
  bloodCollection: state.admin == null ? false : state.admin.bloodCollection,
}))
export default class PriorScreen extends React.Component<Props> {
  static navigationOptions = {
    title: "Prior to Collection",
  };
  _onSelectLocation = () => {
    this.props.navigation.push("SelectLocation");
  };
  _getBloodCollectionOptions(bloodCollection: boolean): Map<string, boolean> {
    return new Map([
      ["Available", bloodCollection],
      ["Not Available", !bloodCollection],
    ]);
  }
  render() {
    return (
      <ScreenContainer>
        <KeyValueLine item="Date of Screening" value={getTodaysDate()} />
        <Text style={styles.sectionHeaderText}>Collection Location</Text>
        <EditSettingButton
          label={this.props.location ? this.props.location : "Select one"}
          onPress={this._onSelectLocation}
        />
        <Text style={styles.descriptionText}>
          The site where this device is being used to facilitate sample
          collection
        </Text>
        <Text style={styles.sectionHeaderText}>Blood Collection</Text>
        <OptionList
          data={this._getBloodCollectionOptions(this.props.bloodCollection)}
          numColumns={1}
          fullWidth={true}
          multiSelect={false}
          backgroundColor="#fff"
          onChange={data =>
            this.props.dispatch(setBloodCollection(!!data.get("Available")))
          }
        />
        <Text style={styles.descriptionText}>
          If blood sample collection is available at this site, then the option
          to contribute will be given to participants during enrollment.
        </Text>
      </ScreenContainer>
    );
  }
}

const styles = StyleSheet.create({
  sectionHeaderText: {
    marginTop: 35,
    marginBottom: 7,
    marginLeft: 15,
    fontSize: 24,
  },
  descriptionText: {
    marginLeft: 15,
    fontSize: 17,
  },
});
