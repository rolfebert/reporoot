# NBS Classification System Summary

## Official NBS Structure

### Divisions
- **Division I**: Old (pre-1918) non-uniform buttons
- **Division II**: Uniform buttons (any age)
- **Division III**: Modern/Vintage (post-1918) non-uniform buttons
- **Division IV**: Related specialties (buckles, links, studs, etc.)
- **Division IX**: Age not considered (buttons from Div I and/or III)

### Materials (Sections 1-16)
1. Celluloid
2. Ceramics
3. China
4. Enamels
5. Fabrics/Textiles
6. Glass, Black
7. Glass, Clear and Colored
8. Glass Mounted in/on Metal
9. Horn
10. Metals
11. Shell
12. Synthetic Polymers
13. Vegetable Ivory
14. Wood
15. Other Materials
16. Materials Summary

### Pictorials (Sections 17-21)
17. Animals
18. Objects (without people)
19. Plants
20. Other Pictorials
21. Pictorials Summary

### Other Classifications (Sections 22-27)
22. Patterns, Symbols
23. Specific Types
24. 18th Century (or earlier)
25. Usage (Non-military)
26. Complete Summary
27. Related Pairs/Sets

## Classification Code Format
- Format: `SECTION-CLASS.SUBCLASS`
- Example: `10-5.2` (Metals section, class 5, subclass 2)
- Each section has numbered classes (bold in book)
- Subclasses use decimal notation

## Key Fields for Button Database

### Required NBS Fields
1. **nbsCode** - Full classification code (e.g., "10-5.2")
2. **division** - Division I, II, III, IV, or IX
3. **section** - Section number (1-27) and name
4. **material** - Primary material from Materials list
5. **buttonName** - Descriptive name (NOT generic "Button 1")
6. **age** - "Old" (pre-1918), "Modern/Vintage" (post-1918), or specific year
7. **size** - Diameter in standard NBS measurements
8. **holes** - Number of sewing holes
9. **backType** - Shank type (self-shank, metal shank, etc.)
10. **condition** - Button condition assessment
11. **manufacturer** - If identifiable
12. **notes** - Additional classification details

### Optional Fields
- **pictorialSubject** - If pictorial button (animal, plant, object, etc.)
- **pattern** - If pattern/symbol button
- **usageType** - Original usage (coat, vest, trouser, etc.)
- **color** - Primary color(s)
- **style** - Art Deco, Victorian, etc.

## Database Structure Recommendation

### Proposed Schema Changes

```sql
-- Item table (buttons)
ALTER TABLE Item ADD COLUMN nbsCode VARCHAR(50);  -- e.g., "10-5.2"
ALTER TABLE Item ADD COLUMN division VARCHAR(10);  -- I, II, III, IV, IX
ALTER TABLE Item ADD COLUMN section INT;  -- 1-27
ALTER TABLE Item ADD COLUMN sectionName VARCHAR(100);  -- "Metals", "Glass", etc.
ALTER TABLE Item ADD COLUMN age VARCHAR(50);  -- "Old (pre-1918)", "Modern", or year
ALTER TABLE Item ADD COLUMN backType VARCHAR(100);  -- Shank type
ALTER TABLE Item ADD COLUMN pictorialSubject VARCHAR(255);  -- For pictorial buttons
ALTER TABLE Item ADD COLUMN pattern VARCHAR(255);  -- For pattern buttons
ALTER TABLE Item ADD COLUMN usageType VARCHAR(100);  -- Original usage

-- Rename 'title' to 'buttonName' for clarity
-- Keep existing: material, size, diameter, color, holes, style, buttonCondition, manufacturer, notes
```

### UI Form Structure
1. **Button Name/Title** - Required, descriptive (AI should extract from NBS code or description)
2. **NBS Code** - Primary classification (e.g., "10-5.2")
3. **Division** - Dropdown: I, II, III, IV, IX
4. **Section** - Dropdown with all 27 sections
5. **Material** - Dropdown from NBS materials list
6. **Age** - "Old (pre-1918)", "Modern/Vintage (post-1918)", or specific year
7. **Size/Diameter** - Measurement field
8. **Holes** - Number field
9. **Back Type** - Shank type description
10. **Color** - Text field
11. **Condition** - Dropdown or text
12. **Manufacturer** - Text field
13. **Pictorial Subject** - If applicable
14. **Pattern** - If applicable
15. **Usage Type** - Original purpose
16. **Notes** - Additional details

## AI Prompt Updates

The AI should be instructed to:
1. Identify the **division** (Old vs Modern/Vintage based on style/age indicators)
2. Determine the **section** (Materials, Pictorials, Patterns, etc.)
3. Extract the **material** from NBS materials list
4. Assess the **age** (pre-1918 or post-1918 based on manufacturing techniques)
5. Identify **back type** (self-shank, metal shank, sew-through, etc.)
6. For pictorials: identify **pictorial subject** (animal, plant, object)
7. For patterns: identify **pattern type**
8. Estimate **NBS code** based on classification
9. Suggest a **descriptive button name** (NOT "Button 1")

## Next Steps

1. Update Prisma schema with NBS fields
2. Run database migration
3. Update imageAnalysis.ts prompt with NBS classification guidance
4. Update frontend form with proper NBS fields
5. Update batch creation to use NBS code or descriptive name as title
