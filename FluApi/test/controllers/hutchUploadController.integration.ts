// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an MIT-style license that
// can be found in the LICENSE file distributed with this file.

import request from "supertest";
import { publicApp, internalApp } from "../../src/app";
import { VisitNonPII, VisitPII } from "../../src/models/visit";
import { VisitNonPIIInstance, VisitPIIInstance } from "../../src/models/visit";
import { AccessKey } from "../../src/models/accessKey";
import {
  AddressInfo,
  DocumentType,
  VisitInfo,
  AddressInfoUse
} from "audere-lib/snifflesProtocol";
import { VisitInfoBuilder } from "../visitInfoBuilder";
import { HutchUpload } from "../../src/models/hutchUpload";
import { baseUrl } from "../../src/util/hutchUploadConfig";
import { smartyStreetsBaseUrl } from "../../src/util/geocodingConfig";
import rawResponse from "../resources/geocodingRawResponse.json";

import nock = require("nock");

describe("export controller", () => {
  let accessKey;

  beforeAll(async done => {
    accessKey = await AccessKey.create({
      key: "accesskey1",
      valid: true
    });
    done();
  });

  afterAll(async done => {
    await accessKey.destroy();
    done();
  });

  async function destroyVisits(
    instances: (VisitNonPIIInstance | VisitPIIInstance)[]
  ): Promise<void[]> {
    return Promise.all(instances.map(i => i.destroy()));
  }

  async function createVisit(
    csruid: string,
    visit: VisitInfo
  ): Promise<[VisitNonPIIInstance, VisitPIIInstance]> {
    const contents = {
      schemaId: 1,
      csruid: csruid,
      documentType: DocumentType.Visit,
      device: {
        installation: "uuid",
        clientVersion: "1.2.3-testing",
        deviceName: "My Phone",
        yearClass: "2020",
        idiomText: "handset",
        platform: "iOS"
      },
      visit: visit
    };

    await request(publicApp)
      .put(`/api/documents/${accessKey.key}/${csruid}`)
      .send(contents)
      .expect(200);

    const visitPII = await VisitPII.findOne({ where: { csruid: csruid } });

    const visitNonPII = await VisitNonPII.findOne({
      where: { csruid: csruid }
    });

    return [visitNonPII, visitPII];
  }

  describe("get pending encounters", () => {
    it("should retrieve only completed vists", async () => {
      await request(internalApp)
        .get("/api/export/getEncounters")
        .expect(200)
        .expect(res => expect(res.body.encounters).toHaveLength(0));

      const visitId1 = "ABC123-_".repeat(8);
      const visit1 = new VisitInfoBuilder().build();
      const c1 = await createVisit(visitId1, visit1);

      const visitId2 = "LMN789-_".repeat(8);
      const visit2 = new VisitInfoBuilder().withComplete(false).build();
      const c2 = await createVisit(visitId2, visit2);

      try {
        await request(internalApp)
          .get("/api/export/getEncounters")
          .expect(200)
          .expect(bodyOnlyContainsFirstVisit);

        function bodyOnlyContainsFirstVisit(res) {
          expect(res.body.encounters).toHaveLength(1);
          if (!visitId1.startsWith(res.body.encounters[0].id)) {
            throw new Error(
              "Encounter id is not a prefix of the correct csruid, this is " +
                "not the correct record"
            );
          }
        }
      } finally {
        await destroyVisits([...c1, ...c2]);
      }
    });

    it("should not return encounters that have already been uploaded", async () => {
      const visitId1 = "ABC123-_".repeat(8);
      const visit1 = new VisitInfoBuilder().build();
      const c1 = await createVisit(visitId1, visit1);

      try {
        await HutchUpload.bulkCreate([{ visitId: +c1[0].id }]);

        await request(internalApp)
          .get("/api/export/getEncounters")
          .expect(200)
          .expect(res => expect(res.body.encounters).toHaveLength(0));
      } finally {
        await destroyVisits(c1);
      }
    });
  });

  describe("send encounters", () => {
    it("should update the upload log based on response status from the Hutch endpoint", async () => {
      const visitId1 = "ABC123-_".repeat(8);
      const visit1 = new VisitInfoBuilder().build();
      const c = await createVisit(visitId1, visit1);

      try {
        nock(await baseUrl)
          .post(new RegExp(".*"), new RegExp(".*ABC123.*"))
          .reply(200);

        const response = await request(internalApp)
          .get("/api/export/sendEncounters")
          .expect(200);

        expect(response.body.sent).toHaveLength(1);
        expect(response.body.sent[0]).toBe(c[0].id);

        const uploaded = await HutchUpload.findAll({
          where: {
            visitId: c[0].id
          }
        });

        expect(uploaded.length).toBe(1);
        expect(uploaded[0].visitId).toBe(+c[0].id);
      } finally {
        await destroyVisits(c);
      }
    });

    it("should not require communication with external services when there are no pending records", async () => {
      const response = await request(internalApp)
        .get("/api/export/sendEncounters")
        .expect(200);

      expect(response.body.sent.length).toBe(0);
    });

    it("should error if geocoding fails", async () => {
      const address: AddressInfo = {
        use: AddressInfoUse.Home,
        line: ["4059 Mt Lee Dr."],
        city: "Hollywood",
        state: "CA",
        postalCode: "90086",
        country: "US"
      };

      const visitId1 = "ABC123-_".repeat(8);
      const visit1 = new VisitInfoBuilder().withAddress(address).build();
      const c1 = await createVisit(visitId1, visit1);

      try {
        nock(smartyStreetsBaseUrl)
          .get(new RegExp(".*"))
          .reply(400);

        await request(internalApp)
          .get("/api/export/sendEncounters")
          .expect(500);
      } finally {
        await destroyVisits(c1);
      }
    });

    it("should batch data sent to the geocoding service", async () => {
      const seq = Array.from(Array(10).keys());
      const visits = seq.map(id => {
        const address: AddressInfo = {
          use: AddressInfoUse.Home,
          line: [id + " Broadway E"],
          city: "Seattle",
          state: "WA",
          postalCode: "98102",
          country: "US"
        };

        const visitInfo = new VisitInfoBuilder().withAddress(address).build();

        return createVisit(
          "HIJ0" + ("0" + id).slice(-2) + "-_".repeat(8),
          visitInfo
        );
      });

      const c = await Promise.all(visits);

      try {
        nock(smartyStreetsBaseUrl)
          .post(new RegExp(".*"))
          .reply(200, rawResponse);

        nock(await baseUrl)
          .post(new RegExp(".*"))
          .times(10)
          .reply(200);

        await request(internalApp)
          .get("/api/export/sendEncounters")
          .expect(200);
      } finally {
        await destroyVisits([...c[0], ...c[1]]);
      }
    });
  });
});
