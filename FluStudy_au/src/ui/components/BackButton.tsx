// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import React from "react";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { withNavigation, NavigationScreenProp } from "react-navigation";
import Button from "./Button";

interface Props {
  label?: string;
  navigation: NavigationScreenProp<any, any>;
  namespace: string;
  primary?: boolean;
}

class BackButton extends React.Component<Props & WithNamespaces> {
  _onNext = () => {
    this.props.navigation.pop();
  };

  render() {
    const { label, namespace, primary, t } = this.props;
    return (
      <Button
        enabled={true}
        label={label ? t(namespace + ":" + label) : t("common:button:back")}
        primary={primary === false ? primary : true}
        onPress={this._onNext}
      />
    );
  }
}

export default withNavigation(withNamespaces()(BackButton));
