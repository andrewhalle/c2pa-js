/**
 * Copyright 2022 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import {
  ClaimGeneratorInfo,
  Credential,
  ResourceStore,
  SignatureInfo,
  Manifest as ToolkitManifest,
} from '@contentauth/toolkit';
import { AssertionAccessor, createAssertionAccessor } from './assertions';
import { Ingredient, createIngredient } from './ingredient';
import { ManifestMap } from './manifestStore';
import { Thumbnail, createThumbnail } from './thumbnail';
import {
  CawgReport,
  getVerifiedIdentitiesFromCawgManifestReports,
  VerifiedIdentity,
} from './lib/cawg';

type ResolvedClaimGeneratorInfo = Omit<ClaimGeneratorInfo, 'icon'> & {
  icon: Thumbnail | null;
};

export interface Manifest {
  /**
   * Label for this manifest in the manifest store
   */
  label: string | null;

  /**
   * Human-readable title, generally source filename
   */
  title: string;

  /**
   * MIME type of the asset associated with this manifest
   */
  format: string;

  /**
   * Optional prefix added to the generated manifest label
   */
  vendor: string | null;

  /**
   * User Agent string identifying the software/hardware/system that created this manifest
   */
  claimGenerator: string | null;
  claimGeneratorHints: Record<string, unknown> | null;
  claimGeneratorInfo: ResolvedClaimGeneratorInfo[];

  /**
   * Instance ID from `xmpMM:InstanceID` in XMP metadata.
   */
  instanceId: string;

  /**
   * Signature information (issuer, date) associated with this manifest
   */
  signatureInfo: SignatureInfo | null;

  /**
   * List of Verifiable Credentials
   */
  credentials: Credential[];

  /**
   * List of ingredients included within this manifest
   */
  ingredients: Ingredient[];

  /**
   * List of URIs referencing redacted assertions
   */
  redactions: string[];

  /**
   * The manifest this manifest is an ingredient of, if applicable
   */
  parent: Manifest | null;

  /**
   * Thumbnail accessor, if available
   */
  thumbnail: Thumbnail | null;

  /**
   * Interface providing access to assertions contained within this manifest
   */
  assertions: AssertionAccessor;

  verifiedIdentities: VerifiedIdentity[];
}

function parseClaimGeneratorInfo(
  resources: ResourceStore,
  info: ClaimGeneratorInfo[] | null | undefined,
): ResolvedClaimGeneratorInfo[] {
  if (info) {
    return info.map((fields) => {
      return {
        ...fields,
        icon: fields.icon ? createThumbnail(resources, fields.icon) : null,
      } as ResolvedClaimGeneratorInfo;
    });
  }

  return [];
}

/**
 * Creates a facade object with convenience methods over manifest data returned from the toolkit.
 *
 * @param manifestData Raw manifest data returned by the toolkit
 * @param manifests A map of previously-created manifest objects to be provided to ingredients. Must contain any manifest referenced by this manifest's ingredients.
 * @param cawgData Deserialized CAWG report returned by the toolkit
 */
export function createManifest(
  manifestData: ToolkitManifest,
  manifests: ManifestMap,
  cawgData: CawgReport,
): Manifest {
  const ingredients = manifestData.ingredients.map((ingredientData) =>
    createIngredient(
      ingredientData,
      ingredientData.active_manifest
        ? manifests[ingredientData.active_manifest]
        : undefined,
    ),
  );

  return {
    label: manifestData.label ?? null,
    title: manifestData.title,
    format: manifestData.format,
    vendor: manifestData.vendor ?? null,
    claimGenerator: manifestData.claim_generator ?? null,
    claimGeneratorHints: manifestData.claim_generator_hints ?? null,
    claimGeneratorInfo: parseClaimGeneratorInfo(
      manifestData.resources,
      manifestData.claim_generator_info,
    ),
    instanceId: manifestData.instance_id,
    signatureInfo: manifestData.signature_info ?? null,
    credentials: manifestData.credentials ?? [],
    ingredients,
    redactions: manifestData.redactions ?? [],
    parent: null,
    thumbnail: createThumbnail(manifestData.resources, manifestData.thumbnail),
    assertions: createAssertionAccessor(manifestData.assertions),
    verifiedIdentities:
      manifestData.label && cawgData[manifestData.label]
        ? getVerifiedIdentitiesFromCawgManifestReports(
            cawgData[manifestData.label],
          )
        : [],
  };
}
