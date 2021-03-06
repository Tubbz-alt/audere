// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import React from "react";
import { NavigationScreenProp } from "react-navigation";
import { connect } from "react-redux";
import {
  Action,
  StoreState,
  setLocation,
  setLocationType,
} from "../../../store";
import BackButton from "../../components/BackButton";
import FeedbackButton from "../../components/FeedbackButton";
import FeedbackModal from "../../components/FeedbackModal";
import OptionList, {
  newSelectedOptionsList,
} from "../../components/OptionList";
import ScreenContainer from "../../components/ScreenContainer";

import { Locations as COLLECTION_LOCATIONS } from "audere-lib/locations";
import { getLocationType } from "../../../resources/LocationConfig";

interface Props {
  navigation: NavigationScreenProp<any, any>;
  location: string;
  dispatch(action: Action): void;
  screenProps: any;
}

@connect((state: StoreState) => ({
  location: state.admin.location,
}))
export default class SelectLocationScreen extends React.Component<Props> {
  static navigationOptions = ({
    navigation,
  }: {
    navigation: NavigationScreenProp<any, any>;
  }) => {
    const { params = null } = navigation.state;
    return {
      headerLeft: (
        <BackButton navigation={navigation} text={"Prior to Collection"} />
      ),
      title: "Select Location",
      headerRight: !!params ? (
        <FeedbackButton onPress={params.showFeedback} />
      ) : null,
    };
  };

  state = {
    feedbackVisible: false,
  };

  componentDidMount() {
    this.props.navigation.setParams({
      showFeedback: () => this.setState({ feedbackVisible: true }),
    });
  }

  _getSelectedOptions = () => {
    const list = newSelectedOptionsList(Object.keys(COLLECTION_LOCATIONS));
    return list.map(location => {
      return {
        key: location.key,
        selected: location.key === this.props.location,
      };
    });
  };

  render() {
    return (
      <ScreenContainer>
        <FeedbackModal
          visible={this.state.feedbackVisible}
          onDismiss={() => this.setState({ feedbackVisible: false })}
        />
        <OptionList
          data={this._getSelectedOptions()}
          numColumns={1}
          multiSelect={false}
          fullWidth={true}
          backgroundColor="#fff"
          onChange={data => {
            const location = data.find(option => option.selected);
            if (!!location) {
              this.props.dispatch(setLocation(location.key));
              this.props.dispatch(
                setLocationType(getLocationType(location.key))
              );
            }
          }}
        />
      </ScreenContainer>
    );
  }
}
