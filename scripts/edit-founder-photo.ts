import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";

async function main() {
  const zai = await ZAI.create();

  // Read the original photo as base64
  const imageBuffer = fs.readFileSync("/home/z/my-project/public/founder-arpit.jpg");
  const base64Image = imageBuffer.toString("base64");
  const dataUrl = `data:image/jpeg;base64,${base64Image}`;

  console.log("Calling image edit API...");

  const response = await zai.images.generations.edit({
    prompt:
      "Professional portrait photo of a young Indian man wearing glasses and a purple suit jacket. Remove the entire background completely and replace with pure solid white background. Keep the person, their clothing, glasses, and pose exactly the same. Maintain natural lighting on the person. Clean, professional headshot on white background.",
    image: dataUrl,
    size: "768x1344",
  });

  if (response.data && response.data[0] && response.data[0].base64) {
    const editedBuffer = Buffer.from(response.data[0].base64, "base64");
    fs.writeFileSync("/home/z/my-project/public/founder-arpit-whitebg.png", editedBuffer);
    console.log("✅ Saved founder-arpit-whitebg.png");
    console.log(`   Size: ${(editedBuffer.length / 1024).toFixed(0)} KB`);
  } else {
    console.error("❌ No image data in response");
    console.log(JSON.stringify(response, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
