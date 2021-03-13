import { Schema } from "mongoose";

export const DataLoadEntityStatus = new Schema({
    name: {type: String, required: true},
    job: {type: String, required: true, unique: true},
});
