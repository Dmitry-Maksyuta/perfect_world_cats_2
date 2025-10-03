import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import TelegramBot from "node-telegram-bot-api";

const app = express();
const PORT = 3000;

app.use(cors());

const TOKEN = "8006121699:AAH6q0cUygpKhBKh0NeXmq8ZbfREum-q1Uc";
const CHAT_ID = "-1003180707662";

const bot = new TelegramBot(TOKEN);

async function fetchCats({ item_id = "798", show = "buy", page = "1" }) {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const pageP = await browser.newPage();

        await pageP.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
        );

        const url = `https://comeback.pw/cats/136/?item_id=${item_id}&show=${show}&page=${page}`;
        await pageP.goto(url, { waitUntil: "networkidle2" });

        const items = await pageP.evaluate(() => {
            const titles = [];
            document.querySelectorAll(".cats__item").forEach(el => {
                titles.push(el.innerText.trim());
            });
            return titles;
        });

        return items.length ? items[0] : ["Нічого не знайшов 😿"];
    } catch (err) {
        console.error("❌ Помилка Puppeteer:", err);
        return ["Помилка при завантаженні сторінки"];
    } finally {
        if (browser) await browser.close();
    }
}

const readItemNameAndPrice = async () => {
    const items = [
        { id: "803", name: "Сплавленная сталь" },
        { id: "808", name: "Алмазный порошок" },
        { id: "798", name: "Качественная древесина" },
        { id: "818", name: "Углеродное топливо" }
    ];

    const pattern = /\d{1,3}(?:,\d{3})+/g;

    const fetches = items.map(item => fetchCats({ item_id: item.id, show: "buy" }));
    const dataList = await Promise.all(fetches);

    const messages = [];

    dataList.forEach((data, index) => {
        const matches = data.match(pattern) || [];
        matches.forEach((match) => {
            const num = parseInt(match.replace(/,/g, ''), 10);
            messages.push(`${items[index].name} - актуальная цена покупки ${num}`);
        });
    });

    if (messages.length > 0) {
        await bot.sendMessage(CHAT_ID, messages.join("\n"));
    } else {
        await bot.sendMessage(CHAT_ID, "Нет данных для отправки");
    }
};

app.get("/api/cats", async (req, res) => {
    const { item_id, show, page } = req.query;
    const item = await fetchCats({ item_id, show, page });
    res.json({ item });
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер працює на http://localhost:${PORT}`);
    readItemNameAndPrice();
    setInterval(readItemNameAndPrice, 5 * 60 * 1000);
});
