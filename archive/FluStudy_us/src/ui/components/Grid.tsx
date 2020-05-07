// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import React from "react";
import {
  Dimensions,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { GUTTER } from "../styles";

interface Props {
  alignRow?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-around"
    | "space-between"
    | "space-evenly";
  columns: number;
  itemFencePostStyle?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
  items: any[];
  rowFencePostStyle?: StyleProp<ViewStyle>;
  rowStyle?: StyleProp<ViewStyle>;
  keyExtractor(item: any, index: number): string;
  renderItem(item: any, width: number): any;
  style?: StyleProp<ViewStyle>;
}

export default class Grid extends React.Component<Props> {
  render() {
    let index = 0;
    let i = 0;
    const rows = [];

    while (index < this.props.items.length) {
      const itemWidth =
        (Dimensions.get("window").width - GUTTER * (this.props.columns + 1)) /
        this.props.columns;

      const row = [];

      for (i = index; i < index + this.props.columns; i++) {
        row.push(
          <View
            key={this.props.keyExtractor(this.props.items[i], i)}
            style={[
              styles.item,
              this.props.itemStyle,
              i != index && styles.itemMargin,
              i != index && this.props.itemFencePostStyle,
              rows.length > 0 && this.props.rowFencePostStyle,
            ]}
          >
            {this.props.renderItem(this.props.items[i], itemWidth)}
          </View>
        );
      }
      rows.push(
        <View key={"row" + i} style={[styles.row, this.props.rowStyle]}>
          {row}
        </View>
      );
      index = index + this.props.columns;
    }

    return <View style={[styles.grid, this.props.style]}>{rows}</View>;
  }
}

const styles = StyleSheet.create({
  grid: {
    alignItems: "center",
    alignSelf: "stretch",
  },
  item: {
    flex: 1,
  },
  itemMargin: {
    marginLeft: GUTTER,
  },
  row: {
    alignItems: "flex-end",
    alignSelf: "stretch",
    flexDirection: "row",
  },
});
