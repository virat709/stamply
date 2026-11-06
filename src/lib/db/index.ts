import { isFirebaseConfigured } from "@/lib/firebase";
import * as local from "./local";
import * as server from "./server";

/** Firebase configured -> the browser talks only to /api/* (server-trusted);
 *  otherwise -> localStorage demo (dev/preview only, never production). */
export const impl = (isFirebaseConfigured ? server : local) as unknown as typeof local;

export const listBusinesses = impl.listBusinesses;
export const getBusiness = impl.getBusiness;
export const saveBusiness = impl.saveBusiness;
export const createBusiness = impl.createBusiness;
export const getOwnerBusinesses = impl.getOwnerBusinesses;
export const getCard = impl.getCard;
export const getCardFor = impl.getCardFor;
export const getOrCreateCard = impl.getOrCreateCard;
export const addStamp = impl.addStamp;
export const addStampByContact = (impl as typeof local & typeof server).addStampByContact;
export const redeemReward = impl.redeemReward;
export const createStampToken = impl.createStampToken;
export const getStampToken = impl.getStampToken;
export const getBusinessStats = impl.getBusinessStats;
export const submitReview = impl.submitReview;
export const listReviews = impl.listReviews;
export const submitCollect = (impl as typeof local & typeof server).submitCollect;
export const lookupCard = (impl as typeof local & typeof server).lookupCard;
export const claimAfterVerification = (impl as typeof local & typeof server).claimAfterVerification;
export const getVerificationRequest = impl.getVerificationRequest;
export const listVerificationRequests = impl.listVerificationRequests;
export const approveVerificationRequest = impl.approveVerificationRequest;
