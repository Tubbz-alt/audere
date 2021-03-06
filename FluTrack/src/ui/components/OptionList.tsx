// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import React from "react";
import {
  Dimensions,
  FlatList,
  LayoutAnimation,
  StyleProp,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { WithNamespaces, withNamespaces } from "react-i18next";
import Text from "./Text";

interface Option {
  key: string;
  selected: boolean;
}

interface Props {
  data: Option[];
  multiSelect: boolean;
  numColumns: number;
  withOther?: boolean;
  otherOption?: string | null;
  exclusiveOption?: string;
  inclusiveOption?: string;
  style?: StyleProp<ViewStyle>;
  otherPlaceholder?: string;
  onChange(data: Option[]): void;
  onOtherChange?(value: string): void;
  fullWidth?: boolean;
  backgroundColor?: string;
}

export const emptyList = (data: string[]) => {
  return data.map(option => {
    return {
      key: option,
      selected: false,
    };
  });
};

const newSelectedOptionsList = (
  options: string[],
  selected?: Option[]
): Option[] => {
  return selected ? selected.slice(0) : emptyList(options);
};

export { newSelectedOptionsList };

class OptionList extends React.Component<Props & WithNamespaces> {
  _onPressItem = (id: string) => {
    const dataItem = this.props.data.find(option => option.key === id);
    if (!!dataItem) {
      const toggled = !dataItem.selected;

      let data =
        !this.props.multiSelect || this.props.exclusiveOption === id
          ? emptyList(this.props.data.map(option => option.key))
          : this.props.data.slice(0);

      data = data.map(option => {
        if (
          this.props.inclusiveOption === id &&
          this.props.exclusiveOption !== option.key
        ) {
          return {
            key: option.key,
            selected: true,
          };
        }

        if (
          this.props.exclusiveOption === option.key &&
          this.props.exclusiveOption !== id
        ) {
          return {
            key: option.key,
            selected: false,
          };
        }

        if (
          this.props.inclusiveOption === option.key &&
          this.props.inclusiveOption !== id
        ) {
          return {
            key: option.key,
            selected: false,
          };
        }

        return {
          key: option.key,
          selected: option.key === id ? toggled : option.selected,
        };
      });

      if (
        this.props.exclusiveOption != null &&
        this.props.exclusiveOption !== id
      ) {
      }
      this.props.onChange(data);
    }
  };

  render() {
    const { t } = this.props;
    const marginHorizontal = this.props.fullWidth ? 0 : 50;
    const itemWidth =
      (Dimensions.get("window").width -
        2 * marginHorizontal -
        this.props.numColumns * 20) /
      this.props.numColumns;
    const totalHeight =
      Math.ceil(this.props.data.length / this.props.numColumns) * 46;

    return (
      <View style={[styles.container, this.props.style && this.props.style]}>
        <View style={{ height: totalHeight }}>
          <FlatList
            data={this.props.data}
            numColumns={this.props.numColumns}
            scrollEnabled={false}
            keyExtractor={item => item.key}
            renderItem={({ item }) => (
              <TranslatedListItem
                id={item.key}
                selected={item.selected}
                width={itemWidth}
                smallText={
                  this.props.data.length > 12 && this.props.numColumns > 1
                }
                backgroundColor={this.props.backgroundColor}
                onPressItem={this._onPressItem}
              />
            )}
          />
        </View>
        {this.props.withOther &&
          !!this.props.data.find(
            option => option.key.toLowerCase() === "other"
          ) &&
          this.props.data.find(option => option.key.toLowerCase() === "other")!
            .selected && (
            <View style={styles.otherContainer}>
              <Text
                style={{ marginBottom: 10, fontSize: 18 }}
                content={t("pleaseSpecify")}
              />
              <View style={styles.item}>
                <TextInput
                  autoFocus={true}
                  placeholder={this.props.otherPlaceholder}
                  style={styles.itemText}
                  returnKeyType="done"
                  value={
                    this.props.otherOption ? this.props.otherOption : undefined
                  }
                  onChangeText={this.props.onOtherChange}
                />
              </View>
            </View>
          )}
      </View>
    );
  }
}
export default withNamespaces("optionList")(OptionList);

interface ItemProps {
  id: string;
  selected: boolean;
  width: number;
  smallText?: boolean;
  backgroundColor?: string;
  onPressItem(id: string): void;
}

class ListItem extends React.PureComponent<ItemProps & WithNamespaces> {
  _onPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    this.props.onPressItem(this.props.id);
  };

  render() {
    return (
      <TouchableOpacity
        style={[
          styles.item,
          { width: this.props.width },
          { backgroundColor: this.props.backgroundColor },
        ]}
        onPress={this._onPress}
      >
        <Text
          content={this.props.t("surveyOption:" + this.props.id)}
          style={[styles.itemText, this.props.smallText && styles.smallText]}
        />
        {this.props.selected && <Feather name="check" color="blue" size={20} />}
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    marginVertical: 20,
  },
  item: {
    alignSelf: "stretch",
    borderBottomColor: "#bbb",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 10,
    padding: 10,
  },
  itemText: {
    fontSize: 17,
    marginVertical: 0,
  },
  otherContainer: {
    marginHorizontal: 10,
  },
  smallText: {
    fontSize: 14,
  },
});

const TranslatedListItem = withNamespaces()<ItemProps>(ListItem);
