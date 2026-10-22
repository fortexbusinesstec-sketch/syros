// Prepara el bucket de Cloudflare R2 para las subidas de imágenes:
// crea el bucket si no existe y aplica la política CORS que permite al navegador
// hacer PUT (subida directa con URL prefirmada) y GET.
// Uso: npm run r2:setup
import {
  CreateBucketCommand,
  GetBucketCorsCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

try {
  process.loadEnvFile(".env");
} catch {
  // En CI/Vercel las variables ya vienen del entorno.
}

const accountId = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET_NAME;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("Faltan las variables R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID o R2_SECRET_ACCESS_KEY.");
  process.exit(1);
}

const endpoint = (process.env.R2_S3_API || `https://${accountId}.r2.cloudflarestorage.com`).replace(/\/+$/, "");
const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

// Orígenes permitidos: separados por coma. Por defecto, cualquiera.
const allowedOrigins = (process.env.R2_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: allowedOrigins,
      AllowedMethods: ["GET", "HEAD", "PUT"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 86400,
    },
  ],
};

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  console.log(`= bucket "${bucket}" ya existe`);
} catch (error) {
  if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound") {
    await client.send(
      new CreateBucketCommand({
        Bucket: bucket,
        CreateBucketConfiguration: { LocationConstraint: "auto" },
      }),
    );
    console.log(`+ bucket "${bucket}" creado`);
  } else {
    throw error;
  }
}

const current = await client.send(new GetBucketCorsCommand({ Bucket: bucket })).catch(() => null);
await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: corsConfiguration }));
console.log(`+ CORS aplicado: ${current?.CORSRules?.length ?? 0} regla(s) anterior(es) reemplazada(s)`);
console.log(`  orígenes: ${allowedOrigins.join(", ")}`);
console.log(`  métodos:  GET, HEAD, PUT`);
console.log("\nListo. Recuérdalo en Vercel: define las mismas variables R2_* en Environment Variables.");
