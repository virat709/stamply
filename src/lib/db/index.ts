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
export const seedDemo = (impl as typeof local & typeof server).seedDemo;
export const getOwnerBusinesses = impl.getOwnerBusinesses;
export const findCustomer = impl.findCustomer;
export const createCustomer = impl.createCustomer;
export const touchCustomer = impl.touchCustomer;
export const getCard = impl.getCard;
export const getCardFor = impl.getCardFor;
export const getOrCreateCard = impl.getOrCreateCard;
export const addStamp = impl.addStamp;
export const addStampByContact = (impl as typeof local & typeof server).addStampByContact;
export const redeemReward = impl.redeemReward;
export const createStampToken = impl.createStampToken;
export const getStampToken = impl.getStampToken;
export const redeemStampToken = impl.redeemStampToken;
export const getBusinessStats = impl.getBusinessStats;
export const submitReview = impl.submitReview;
export const listReviews = impl.listReviews;
export const submitCollect = (impl as typeof local & typeof server).submitCollect;
export const lookupCard = (impl as typeof local & typeof server).lookupCard;
export const claimAfterVerification = (impl as typeof local & typeof server).claimAfterVerification;
export const createReservation = impl.createReservation;
export const listReservations = impl.listReservations;
export const setReservationStatus = impl.setReservationStatus;
export const createVerificationRequest = impl.createVerificationRequest;
export const getVerificationRequest = impl.getVerificationRequest;
export const listVerificationRequests = impl.listVerificationRequests;
export const approveVerificationRequest = impl.approveVerificationRequest;
