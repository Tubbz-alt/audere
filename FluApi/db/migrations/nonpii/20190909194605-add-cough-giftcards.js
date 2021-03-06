// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

'use strict';

const { baseColumns, column, foreignIdKey, nullableColumn, unique } = require("../../util");
const schema = "cough";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      "giftcards",
      {
        ...baseColumns(Sequelize),
        sku: column(Sequelize.STRING),
        denomination: column(Sequelize.DECIMAL(10, 2)),
        card_number: column(Sequelize.STRING),
        pin: column(Sequelize.STRING),
        expiry: column(Sequelize.DATE),
        theme: column(Sequelize.STRING),
        order_number: column(Sequelize.STRING),
        url: column(Sequelize.STRING),
        doc_id: unique(nullableColumn(Sequelize.STRING)),
        barcode: unique(nullableColumn(Sequelize.STRING)),
      },
      { schema }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable({ tableName: "giftcards", schema });
  }
};
