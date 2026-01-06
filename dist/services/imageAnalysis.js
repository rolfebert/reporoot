"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeButtonImage = analyzeButtonImage;
const generative_ai_1 = require("@google/generative-ai");
const fs_1 = __importDefault(require("fs"));
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
async function analyzeButtonImage(imagePath) {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.length < 30) {
            console.warn("Invalid or missing GEMINI_API_KEY - skipping image analysis");
            return {};
        }
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const imageData = fs_1.default.readFileSync(imagePath);
        const base64Image = imageData.toString("base64");
        const prompt = `You are an expert in National Button Society (NBS) classification. Analyze this button image and extract the following information in JSON format:

NBS CLASSIFICATION:
- "nbsCode": NBS classification code in format SECTION-CLASS.SUBCLASS (e.g., "10-5.2" for metals). Leave empty if cannot determine.
- "division": "I" (Old, pre-1918), "III" (Modern/Vintage, post-1918), or "IX" (age uncertain)
- "section": Section number (1-27):
  MATERIALS: 1=Celluloid, 2=Ceramics, 3=China, 4=Enamels, 5=Fabrics/Textiles, 6=Glass Black, 7=Glass Clear/Colored, 8=Glass Mounted in Metal, 9=Horn, 10=Metals, 11=Shell, 12=Synthetic Polymers, 13=Vegetable Ivory, 14=Wood, 15=Other Materials
  PICTORIALS: 17=Animals, 18=Objects, 19=Plants, 20=Other Pictorials
  PATTERNS: 22=Patterns/Symbols, 23=Specific Types, 24=18th Century, 25=Usage
- "sectionName": Name of section (e.g., "Metals", "Glass", "Pictorials - Animals")
- "age": "Old (pre-1918)", "Modern/Vintage (post-1918)", or specific estimated period (e.g., "Victorian Era", "Art Deco 1920s")
- "backType": Shank type (e.g., "self-shank", "metal shank", "sew-through 2-hole", "sew-through 4-hole", "loop shank")
- "pictorialSubject": If pictorial, describe subject (e.g., "bird", "flower", "building", "person")
- "pattern": If patterned, describe (e.g., "geometric", "floral", "Art Deco sunburst")
- "usageType": Original usage (e.g., "coat", "vest", "trouser", "military uniform", "livery")

PHYSICAL PROPERTIES:
- "material": Primary material (Celluloid, Ceramics, China, Enamels, Fabric, Glass, Horn, Metal, Shell, Synthetic Polymer, Vegetable Ivory, Wood, etc.)
- "size": Size description (tiny, small, medium, large, extra-large)
- "diameter": Estimated diameter with unit (e.g., "15mm", "1/2 inch")
- "color": Primary color(s)
- "holes": Number of sewing holes (0 for shank buttons, 2, 4, etc.)
- "style": Design style (Victorian, Edwardian, Art Nouveau, Art Deco, Mid-Century Modern, etc.)
- "buttonCondition": Condition (excellent, good, fair, worn, damaged, chipped, cracked)
- "manufacturer": Manufacturer name if visible or identifiable
- "notes": Any other notable features, markings, or characteristics

Return ONLY valid JSON. If you cannot determine a field, use null. Be specific and use proper NBS terminology.`;
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image,
                },
            },
            prompt,
        ]);
        const response = result.response;
        const text = response.text();
        let jsonText = text.trim();
        if (jsonText.startsWith("```json")) {
            jsonText = jsonText.substring(7);
        }
        else if (jsonText.startsWith("```")) {
            jsonText = jsonText.substring(3);
        }
        if (jsonText.endsWith("```")) {
            jsonText = jsonText.substring(0, jsonText.length - 3);
        }
        jsonText = jsonText.trim();
        const buttonInfo = JSON.parse(jsonText);
        return buttonInfo;
    }
    catch (error) {
        console.error("Error analyzing button image:", error);
        return {};
    }
}
