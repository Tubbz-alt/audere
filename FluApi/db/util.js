// Copyright (c) 2018, 2019 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

function baseColumns(sequelize) {
  return {
    id: identity(column(sequelize.INTEGER)),
    createdAt: column(sequelize.DATE),
    updatedAt: column(sequelize.DATE)
  };
}

// Columns disallow null by default
function column(type) {
  return {
    allowNull: false,
    type
  };
}

function nullableColumn(type) {
  return {
    allowNull: true,
    type
  };
}

function identity(column) {
  return {
    ...column,
    autoIncrement: true,
    primaryKey: true
  };
}

function primaryKey(column) {
  return {
    ...column,
    primaryKey: true
  };
}

function unique(column) {
  return {
    ...column,
    unique: true
  };
}

function foreignIdKey(sql, model) {
  return {
    allowNull: false,
    unique: true,
    type: sql.INTEGER,
    references: { model, key: "id" },
    onDelete: "CASCADE"
  };
}

module.exports = {
  baseColumns,
  column,
  foreignIdKey,
  nullableColumn,
  identity,
  primaryKey,
  unique
};
