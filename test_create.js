import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function run() {
     const token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImYyZDFhZDFlLWU0ZTktNGI1My05YTk3LTMzYmU4ZDBiODkyNyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FrY2x3Z3VxemVpanNjZnRhdHFwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI1NmY2NGQ4ZS1lNTNlLTRmZGMtYTIzNC01NmRkYmZmNGI3NzkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzg5MDM5OTE3LCJpYXQiOjE3ODkwMzYzMTcsImVtYWlsIjoidGVzdF8xNzg5MDM2MzE2NjQzQHRlc3QuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6InRlc3RfMTc4OTAzNjMxNjY0M0B0ZXN0LmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInN1YiI6IjU2ZjY0ZDhlLWU1M2UtNGZkYy1hMjM0LTU2ZGRiZmY0Yjc3OSJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzg5MDM2MzE3fV0sInNlc3Npb25faWQiOiI1YWFhZDNkOS1mNzQxLTRmZjgtYWM1MS03MmU2MjcxMTljMWUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.eXy-Qta-GGT-niV3sMH1d_OsAWJqaV44Xu2e9lBIQPJ86N1KTbd1YeLIvwrdCQAjnTZTWLbxcPa59wjY5vytow";
     
     const body = {
        amount: 250,
        type: 'track_purchase',
        return_url: 'https://play-smashify.vercel.app/purchase-success',
        meta: { userId: '56f64d8e-e53e-4fdc-a234-56ddbff4b779', songId: 'fake', artistId: 'fake' }
     };

     const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
     });
     console.log("Create status:", res.status);
     console.log("Create body:", await res.text());
}
run();
