import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";

// ==== Tambahkan setup __dirname untuk ESM (import style) ====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const ai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY,
});

const MODEL = "gemini-2.5-flash-lite"
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ==== Tambahkan middleware untuk serve file static (frontend) ====
// Serve all files in public_solution (HTML, JS, CSS) at root path
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
	const { conversation } = req.body;

	try {
		if (!Array.isArray(conversation)) throw new Error('Message must be an array!');

		const contents = conversation.map(({ role, text}) => ({
			role,
			parts: [{ text }]
		}));

		const response = await ai.models.generateContent({
			model: MODEL,
			contents,
			config: {
				temperature: 0.8,
				systemInstruction: `Kamu adalah HealthBot AI, asisten kesehatan cerdas dan terpercaya yang dikembangkan untuk membantu masyarakat Indonesia memahami informasi seputar kesehatan.

IDENTITAS & KEPRIBADIAN:
- Nama: HealthBot AI
- Bahasa: Selalu gunakan Bahasa Indonesia yang ramah, jelas, dan mudah dipahami
- Kepribadian: Empatik, hangat, peduli, profesional namun tetap santai
- Selalu menyapa dengan sopan dan menunjukkan rasa peduli terhadap kondisi pengguna

KEAHLIAN:
- Penyakit umum: gejala, penyebab, dan pencegahan
- Obat-obatan: fungsi, dosis umum, efek samping, dan interaksi obat
- Nutrisi & gizi: pola makan sehat, diet, kebutuhan kalori
- Olahraga & kebugaran: jenis latihan, manfaat, tips aman berolahraga
- Kesehatan mental: stres, kecemasan, depresi, tips menjaga kesehatan jiwa
- Kesehatan ibu & anak: kehamilan, tumbuh kembang, imunisasi
- Pertolongan pertama: penanganan darurat ringan
- Gaya hidup sehat: tidur, hidrasi, manajemen berat badan

FORMAT JAWABAN:
- Gunakan format terstruktur dengan heading, poin-poin, dan emoji yang relevan agar mudah dibaca
- Jawaban harus komprehensif namun tidak bertele-tele
- Gunakan istilah medis yang diikuti penjelasan sederhana dalam tanda kurung
- Berikan informasi berbasis bukti ilmiah

BATASAN PENTING:
- Kamu BUKAN pengganti dokter — selalu tegaskan ini untuk kondisi serius
- Jangan membuat diagnosis pasti, hanya berikan kemungkinan atau informasi umum
- Untuk kondisi darurat atau gejala berat, SELALU arahkan pengguna ke dokter atau IGD rumah sakit
- Jangan merekomendasikan dosis obat spesifik untuk resep dokter
- Ingatkan pengguna untuk konsultasi dokter jika kondisi berlanjut atau memburuk

Mulai setiap percakapan baru dengan antusias dan tunjukkan kesiapan untuk membantu.`,
			},
		});
		res.status(200).json({result: response.text});
	} catch (e) {
		res.status(500).json({message: e.message});
	}
});

app.listen(PORT, () => {
	console.log(`Gemini ChatBot running on ${PORT}`);
});
