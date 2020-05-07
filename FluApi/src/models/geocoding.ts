// Copyright (c) 2018 by Audere
//
// Use of this source code is governed by an LGPL-3.0 license that
// can be found in the LICENSE file distributed with this file.

import { AddressInfoUse } from "audere-lib/snifflesProtocol";

export interface GeocodingResponse {
  id: string;
  use: AddressInfoUse;
  addresses?: GeocodedAddress[];
}

export interface GeocodedAddress {
  canonicalAddress: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  censusTract?: string;
}
