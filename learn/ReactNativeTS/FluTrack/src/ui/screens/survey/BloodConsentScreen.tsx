import React from "react";
import { connect } from "react-redux";
import { WithNamespaces, withNamespaces } from "react-i18next";
import { Action, StoreState, setBloodConsent } from "../../../store";
import { ConsentInfo, ConsentInfoSignerType } from "audere-lib";
import { NavigationScreenProp } from "react-navigation";
import { format } from "date-fns";
import {
  BloodConsentConfig,
  EnrolledConfig,
} from "../../../resources/ScreenConfig";
import ConsentChrome from "../../components/ConsentChrome";
import SignatureInput from "../../components/SignatureInput";

interface Props {
  bloodConsent?: ConsentInfo;
  consent: ConsentInfo;
  dispatch(action: Action): void;
  navigation: NavigationScreenProp<any, any>;
  name: string;
}

@connect((state: StoreState) => ({
  bloodConsent: state.form.bloodConsent,
  consent: state.form.consent,
  name: state.form!.name,
}))
class BloodConsentScreen extends React.Component<Props & WithNamespaces> {
  _onSubmit = (
    participantName: string,
    signerType: ConsentInfoSignerType,
    signerName: string,
    signature: string,
    relation?: string
  ) => {
    this.props.dispatch(
      setBloodConsent({
        name: signerName,
        terms:
          this.props.t("bloodConsentFormHeader") +
          "\n" +
          this.props.t("bloodFormText"),
        signerType,
        date: format(new Date(), "YYYY-MM-DD"), // FHIR:date
        signature,
        relation,
      })
    );
    this._proceed();
  };

  _proceed = () => {
    if (this.props.navigation.getParam("reconsent")) {
      this.props.navigation.push("Survey");
    } else {
      this.props.navigation.push("Enrolled", { data: EnrolledConfig });
    }
  };

  render() {
    const { t } = this.props;
    return (
      <ConsentChrome
        canProceed={!!this.props.bloodConsent}
        progressNumber="90%"
        navigation={this.props.navigation}
        title={t(BloodConsentConfig.title)}
        proceed={this._proceed}
        description={t(BloodConsentConfig.description!.label)}
        header={t("bloodConsentFormHeader")}
        terms={t("bloodFormText")}
      >
        <SignatureInput
          consent={this.props.bloodConsent}
          editableNames={false}
          participantName={this.props.name}
          relation={this.props.consent.relation}
          signerType={this.props.consent.signerType}
          signerName={this.props.consent.name}
          onSubmit={this._onSubmit}
        />
      </ConsentChrome>
    );
  }
}

export default withNamespaces("bloodConsentScreen")<Props>(BloodConsentScreen);
