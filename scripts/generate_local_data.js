const fs = require('fs');
const path = require('path');

const ayahDir = path.join(__dirname, '..', 'assets', 'ayah');
let surahs = [];

for (let s = 1; s <= 114; s++) {
    const sDir = path.join(ayahDir, s.toString());
    if (fs.existsSync(sDir)) {
        const firstAyah = require(path.join(sDir, '1.json'));
        surahs.push({
            surahName: firstAyah.surahName,
            surahNameArabic: firstAyah.surahNameArabic,
            surahNameArabicLong: firstAyah.surahNameArabicLong,
            surahNameTranslation: firstAyah.surahNameTranslation,
            revelationPlace: firstAyah.revelationPlace,
            totalAyah: firstAyah.totalAyah,
            surahNo: firstAyah.surahNo,
        });
    }
}

fs.writeFileSync(path.join(__dirname, '..', 'assets', 'surah.json'), JSON.stringify(surahs, null, 2));

let code = "export const getAyahData = (surah: number, ayah: number) => {\n";
code += "  const map: Record<string, any> = {\n";

for (let s = 1; s <= 114; s++) {
    const sDir = path.join(ayahDir, s.toString());
    if (fs.existsSync(sDir)) {
        const files = fs.readdirSync(sDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const a = file.replace('.json', '');
                code += `    "${s}_${a}": require("../assets/ayah/${s}/${a}.json"),\n`;
            }
        }
    }
}

code += "  };\n";
code += "  return map[`${surah}_${ayah}`];\n";
code += "};\n";

fs.writeFileSync(path.join(__dirname, '..', 'utils', 'ayahDataResolver.ts'), code);
console.log('Successfully generated assets/surah.json and utils/ayahDataResolver.ts');
