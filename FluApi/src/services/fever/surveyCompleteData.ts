// Copyright (c) 2019 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

import { PIIInfo, SurveyNonPIIDbInfo, SurveyNonPIIInfo } from "audere-lib/feverProtocol";
import { BatchItem, SurveyBatchDataAccess, BatchItemWithCsruid } from "./surveyBatchData";
import { BatchAttributes, BatchDiscardAttributes, BatchItemAttributes, SurveyAttributes, FeverModels, defineFeverModels, ReceivedKitAttributes } from "../../models/db/fever";
import { Model } from "../../util/sql";
import Sequelize from "sequelize";
import logger from "../../util/logger";

export interface SurveyCompleteItem extends BatchItemWithCsruid {
  boxBarcode: string;
  dateReceived: string;
}

/**
 * Shared data access for records that have completed the second half of the
 * app.  Can be customized via the surveyPredicate to tune what records are
 * returned.
 */
export abstract class SurveyCompleteDataAccess extends SurveyBatchDataAccess<SurveyCompleteItem> {
  protected abstract fever: FeverModels;
  protected abstract batchModel: Model<BatchAttributes>;
  protected abstract itemModel: Model<BatchItemAttributes>;
  protected abstract discardModel: Model<BatchDiscardAttributes>;

  protected abstract surveyPredicate(): Sequelize.WhereOptions<
    SurveyAttributes<SurveyNonPIIInfo>
  >;

  /**
   * Retrieves completed surveys based on an input set of previously assigned
   * items.
   */
  public async getExistingItems(
    items: BatchItem[]
  ): Promise<SurveyCompleteItem[] | null> {
    // TODO: check retrieved items against supplied, if database records have
    // been edited to no longer pass the filter we may skip processing a record
    // and mark it as complete 
    return this.getItems(items);
  }

  /**
   * Retrieves completed surveys that have not been processed yet.
   */
  public async getNewItems(): Promise<SurveyCompleteItem[] | null> {
    return this.getItems();
  }

  /**
   * Queries for batch items to fill out both new and existing batches
   */
  private async getItems(
    items?: BatchItem[]
  ): Promise<SurveyCompleteItem[] | null> {
    this.fever.surveyNonPii.hasOne(this.itemModel, {
      foreignKey: "surveyId",
      as: "items",
      onDelete: "CASCADE"
    });

    this.fever.surveyNonPii.hasOne(this.fever.receivedKit, {
      foreignKey: "surveyId",
      as: "received",
      onDelete: "CASCADE"
    });

    let filter = this.surveyPredicate();

    // If a list of items were passed it is an existing batch and we retrieve
    // all the identified surveys.
    if (items != null) {
      filter = {
        ...filter,
        ...{ id: items.map(x => x.surveyId) }
      }
    }

    const surveys = await this.fever.surveyNonPii.findAll({
      where: {
        ...filter,
        "$items.surveyId$": null
      },
      include: [
        {
          model: this.itemModel,
          as: "items",
          required: false
        },
        {
          model: this.fever.receivedKit,
          as: "received",
          required: false
        }
      ],
      order: [["id", "ASC"]]
    });

    // Need to cast the result object to access joined data
    interface HasReceivedKit {
      received: ReceivedKitAttributes
    }

    type SurveyWithReceivedKit =
      SurveyAttributes<SurveyNonPIIDbInfo> & HasReceivedKit;

    if (surveys != null && surveys.length > 0) {
      const result: SurveyCompleteItem[] = surveys.map(s => {
        const swk = <SurveyWithReceivedKit>(<any>s);
        const item: SurveyCompleteItem = {
          surveyId: +swk.id,
          csruid: swk.csruid,
          boxBarcode: swk.received != null ?
            swk.received.boxBarcode :
            undefined,
          dateReceived: swk.received != null ?
            swk.received.dateReceived :
            undefined
        };

        if (items != null) {
          const i = items.find(x => x.surveyId === item.surveyId);
          item.workflowId = i.workflowId;
        }

        return item;
      });

      return result;
    } else {
      logger.debug("No new recipients to process.");
    }

    return null;
  }

  /**
   * Query PII data that matches active batch items, referenced by csruid
   */
  public async getPiiData(
    csruids: string[]
  ): Promise<SurveyAttributes<PIIInfo>[]> {
    const filter = this.surveyPredicate();

    return await this.fever.surveyPii.findAll({
      where: {
        ...filter,
        csruid: csruids
      }
    });
  }
}