import pdfParse from "pdf-parse";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "PDF file is required." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await pdfParse(bytes);

  return Response.json({
    text: result.text.replace(/\s+\n/g, "\n").trim(),
    pages: result.numpages,
    info: result.info
  });
}
