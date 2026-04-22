
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";
dotenv.config();

async function test() {
    console.log("Starting test...");
    const id = process.env.GOOGLE_SHEET_ID || "1sqw8bX_IweU-Ve0_NwkAjwpWnGKK0npDcq8oFwL0RVE";
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "si-rekap-smk@sirekap2026.iam.gserviceaccount.com";
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
    
    if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, "\n").trim().replace(/^['"]|['"]$/g, "");
    }

    console.log("Email:", serviceEmail);
    console.log("Key length:", privateKey.length);

    try {
        const serviceAccountAuth = new JWT({
            email: serviceEmail,
            key: privateKey,
            scopes: [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"
            ],
        });

        const doc = new GoogleSpreadsheet(id, serviceAccountAuth);
        console.log("Loading info...");
        await doc.loadInfo();
        console.log("Title:", doc.title);
        console.log("Sheets:", doc.sheetCount);
    } catch (e: any) {
        console.error("FAILED:", e.message);
        if (e.response) {
            console.error("Response data:", e.response.data);
        }
    }
}

test();
