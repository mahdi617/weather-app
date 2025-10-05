// /js/script.js
// ======= State =======
const state = {
  location: { name: "Rasht", latitude: 37.2808, longitude: 49.5832 },
  tempUnit: "celsius", // "celsius" | "fahrenheit"
  windUnit: "kmh", // "kmh" | "mph"
  precipUnit: "mm", // "mm" | "inch"
  data: null, // آخرین پاسخ API
  selectedDayIndex: 0, // برای hourly dropdown
};

// ======= DOM =======
const els = {
  // today/top
  placeName: document.querySelector(".today-weather-place-name"),
  placeDate: document.querySelector(".today-weather-place-date"),
  todayIcon: document.querySelector(".today-weather-temp-icon"),
  todayTemp: document.querySelector(".today-weather-temp"),
  feelsLike: document.querySelectorAll(".weather-states-card-value")[0],
  humidity: document.querySelectorAll(".weather-states-card-value")[1],
  wind: document.querySelectorAll(".weather-states-card-value")[2],
  precip: document.querySelectorAll(".weather-states-card-value")[3],

  // daily
  dailyWrap: document.querySelector(".daily-forecast-cards"),

  // hourly
  hourlyWrap: document.querySelector(".Hourly-forecast-main"),
  hourlyBtn: document.querySelector(".Hourly-forecast-btn"),
  hourlyBtnText: document.querySelector(".Hourly-forecast-btn-choose-day"),
  hourlyDropdown: document.querySelector(".magicdropdownmenu-Hourly-forecast"),

  // units
  unitsBtn: document.querySelector(".units-btn"),
  unitsDropdown: document.querySelector(".magicdropdownmenu-units"),

  // search
  searchForm: document.querySelector(".search-form"),
  searchInput: document.querySelector(".search-input"),

  // error
  apiError: document.querySelector(".api-error-state"),
};

// ======= Utils =======
const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayNamesLong = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const monthNamesShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmtDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dayNamesLong[dt.getDay()]}, ${
    monthNamesShort[dt.getMonth()]
  } ${dt.getDate()}, ${dt.getFullYear()}`;
}
function dayShort(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return dayNamesShort[dt.getDay()];
}
function toFixedInt(n) {
  return Math.round(Number(n));
}
function show(el) {
  el.style.display = "";
}
function hide(el) {
  el.style.display = "none";
}

// فایل‌ها: ./assets/images/icon-*.webp
const ICONS = {
  sunny: "./assets/images/icon-sunny.webp",
  partlyCloudy: "./assets/images/icon-partly-cloudy.webp",
  overcast: "./assets/images/icon-overcast.webp",
  fog: "./assets/images/icon-fog.webp",
  drizzle: "./assets/images/icon-drizzle.webp",
  rain: "./assets/images/icon-rain.webp",
  snow: "./assets/images/icon-snow.webp",
  storm: "./assets/images/icon-storm.webp",
};

function wmoToIcon(code) {
  // مرجع: کدهای WMO در Open-Meteo
  if (code === 0) return ICONS.sunny; // Clear
  if (code === 1 || code === 2) return ICONS.partlyCloudy; // Mainly clear / Partly cloudy
  if (code === 3) return ICONS.overcast; // Overcast

  if (code === 45 || code === 48) return ICONS.fog; // Fog

  if (code >= 51 && code <= 57) return ICONS.drizzle; // Drizzle
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return ICONS.rain; // Rain + Showers

  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return ICONS.snow; // Snow + Snow showers

  if (code === 95 || code === 96 || code === 99) return ICONS.storm; // Thunderstorm

  return ICONS.overcast; // پیش‌فرض محافظه‌کارانه
}

// ======= API builders =======
function buildForecastURL(
  { latitude, longitude },
  { tempUnit, windUnit, precipUnit }
) {
  // مقادیر مورد انتظار Open-Meteo
  const temp = tempUnit === "fahrenheit" ? "fahrenheit" : "celsius";
  const wind = windUnit === "mph" ? "mph" : "kmh";
  const precip = precipUnit === "inch" ? "inch" : "mm";

  const base = "https://api.open-meteo.com/v1/forecast";
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: temp,
    wind_speed_unit: wind,
    precipitation_unit: precip,
    timezone: "auto",
    forecast_days: "7",
  });
  console.log(`${base}?${params.toString()}`);

  return `${base}?${params.toString()}`;
}

async function geocode(name) {
  const u = new URL("https://geocoding-api.open-meteo.com/v1/search");
  u.searchParams.set("name", name);
  u.searchParams.set("count", "1");
  u.searchParams.set("language", "en");
  u.searchParams.set("format", "json");
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error("geocode-failed");
  const json = await res.json();
  if (!json.results || !json.results.length) throw new Error("no-location");
  const r = json.results[0];
  console.log(u);

  return { name: r.name, latitude: r.latitude, longitude: r.longitude };
}

// ======= Renderers =======
function renderToday(json) {
  const now = new Date();
  els.placeName.textContent = state.location.name.toLowerCase();
  els.placeDate.textContent = fmtDate(now);

  const c = json.current;
  els.todayIcon.src = wmoToIcon(c.weather_code);
  els.todayTemp.textContent = toFixedInt(c.temperature_2m);

  els.feelsLike.textContent = toFixedInt(c.apparent_temperature);
  els.humidity.textContent = `${toFixedInt(c.relative_humidity_2m)}%`;
  els.wind.textContent = `${toFixedInt(c.wind_speed_10m)} ${
    state.windUnit === "mph" ? "mph" : "km/h"
  }`;
  els.precip.textContent = `${toFixedInt(c.precipitation)} ${
    state.precipUnit === "inch" ? "in" : "mm"
  }`;
}

function renderDaily(json) {
  const days = json.daily.time; // ISO dates
  const highs = json.daily.temperature_2m_max;
  const lows = json.daily.temperature_2m_min;
  const codes = json.daily.weather_code;

  els.dailyWrap.innerHTML = "";
  days.forEach((iso, i) => {
    const d = new Date(iso);
    const card = document.createElement("div");
    card.className = "daily-forecast-card"; // مطابق HTML شما
    card.innerHTML = `
      <span class="day-name">${dayShort(d)}</span>
      <img src="${wmoToIcon(codes[i])}" alt="icon" class="day-icon" />
      <div class="day-temps">
        <span class="high-temp">${toFixedInt(highs[i])}</span>
        <span class="low-temp">${toFixedInt(lows[i])}</span>
      </div>
    `;
    // انتخاب روز برای hourly
    card.addEventListener("click", () => {
      state.selectedDayIndex = i;
      els.hourlyBtnText.textContent = dayNamesLong[d.getDay()];
      renderHourly(json);
    });
    els.dailyWrap.appendChild(card);
  });

  // مقدار اولیه دکمه انتخاب روز
  const first = new Date(days[0]);
  els.hourlyBtnText.textContent = dayNamesLong[first.getDay()];
}

function renderHourly(json) {
  const dayISO = json.daily.time[state.selectedDayIndex]; // "YYYY-MM-DD"
  const hoursISO = json.hourly.time; // e.g. "2025-10-03T03:00"
  const temps = json.hourly.temperature_2m;
  const codes = json.hourly.weather_code;

  els.hourlyWrap.innerHTML = "";

  // فقط ساعت‌هایی که تاریخشون برابر با dayISO هست
  // تنظیمات بازه‌ی ساعت (۳PM..۱۰PM)
  const START_HOUR = 15; // 3pm
  const END_HOUR = 22; // 10pm

  // هر بار که می‌خوای Hourly رو بسازی:
  els.hourlyWrap.innerHTML = ""; // پاک کردن آیتم‌های قبلی

  for (let i = 0; i < hoursISO.length; i++) {
    // فقط همون روز
    if (!hoursISO[i].startsWith(dayISO)) continue;

    const t = new Date(hoursISO[i]); // توجه: Open-Meteo با timezone=auto زمان محلی می‌دهد
    const h = t.getHours(); // 0..23

    // فقط 15..22 (۳ تا ۱۰ شب) را نگه دار
    if (h >= START_HOUR && h <= END_HOUR) {
      const hourLabel = t.toLocaleTimeString(undefined, {
        hour: "numeric",
        hour12: true,
      });
      const card = document.createElement("div");
      card.className = "Hourly-forecast-card";
      card.innerHTML = `
      <span class="Hourly-forecast-time">
        <img src="${wmoToIcon(
          codes[i]
        )}" alt="icon" class="Hourly-forecast-icon" />
        ${hourLabel}
      </span>
      <span class="Hourly-forecast-temp">${toFixedInt(temps[i])}</span>
    `;
      els.hourlyWrap.appendChild(card);
    }

    // کمی بهینه: اگر از 22 گذشتیم، ادامه لازم نیست
    if (h > END_HOUR && hoursISO[i].startsWith(dayISO)) break;
  }

  // اگر هیچ ساعتی در این بازه نبود (مثلاً روز آخرِ دیتاست)، پیام کوچیک بده
  if (!els.hourlyWrap.children.length) {
    els.hourlyWrap.innerHTML = `
    <div class="Hourly-forecast-empty">داده‌ای برای ۳ تا ۱۰ شب این روز موجود نیست.</div>
  `;
  }

  // Dropdown items (جمع‌آوری از daily)
  els.hourlyDropdown.innerHTML = "";
  json.daily.time.forEach((iso, idx) => {
    const d = new Date(iso);
    const btn = document.createElement("button");
    btn.className =
      "magicdropdownmenu-item" +
      (idx === state.selectedDayIndex ? " active" : "");
    btn.textContent = dayNamesLong[d.getDay()];
    btn.onclick = () => {
      state.selectedDayIndex = idx;
      els.hourlyBtnText.textContent = btn.textContent;
      toggleHourlyDropdown(false);
      renderHourly(json);
    };
    els.hourlyDropdown.appendChild(btn);
  });
}

// ======= UI: dropdowns =======
function toggleUnitsDropdown(force) {
  const visible =
    force ??
    (els.unitsDropdown.style.display === "none" ||
      els.unitsDropdown.style.display === "");
  els.unitsDropdown.style.display = visible ? "block" : "none";
}
function toggleHourlyDropdown(force) {
  const visible =
    force ??
    (els.hourlyDropdown.style.display === "none" ||
      els.hourlyDropdown.style.display === "");
  els.hourlyDropdown.style.display = visible ? "block" : "none";
}
els.unitsBtn.addEventListener("click", () => toggleUnitsDropdown());
els.hourlyBtn.addEventListener("click", () => toggleHourlyDropdown());

// بایندکردن گزینه‌های واحد
function bindUnitOptions() {
  const groups = els.unitsDropdown.querySelectorAll(
    ".magicdropdownmenu-choose"
  );
  // Temperature
  groups[0].querySelectorAll(".magicdropdownmenu-item").forEach((btn) => {
    btn.onclick = () => {
      groups[0]
        .querySelectorAll(".magicdropdownmenu-item")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.tempUnit = btn.textContent.includes("Fahrenheit")
        ? "fahrenheit"
        : "celsius";
      fetchAndRender();
    };
  });
  // Wind
  groups[1].querySelectorAll(".magicdropdownmenu-item").forEach((btn) => {
    btn.onclick = () => {
      groups[1]
        .querySelectorAll(".magicdropdownmenu-item")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.windUnit = btn.textContent.includes("mph") ? "mph" : "kmh";
      fetchAndRender();
    };
  });
  // Precip
  groups[2].querySelectorAll(".magicdropdownmenu-item").forEach((btn) => {
    btn.onclick = () => {
      groups[2]
        .querySelectorAll(".magicdropdownmenu-item")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.precipUnit = btn.textContent.includes("Inches") ? "inch" : "mm";
      fetchAndRender();
    };
  });

  // "Switch to Imperial/Metric"
  const switchBtn = els.unitsDropdown.querySelector(".magicdropdownmenu-btn");
  if (switchBtn) {
    switchBtn.onclick = () => {
      const toImperial =
        state.tempUnit !== "fahrenheit" ||
        state.windUnit !== "mph" ||
        state.precipUnit !== "inch";
      state.tempUnit = toImperial ? "fahrenheit" : "celsius";
      state.windUnit = toImperial ? "mph" : "kmh";
      state.precipUnit = toImperial ? "inch" : "mm";
      // Sync UI actives
      groups[0]
        .querySelectorAll(".magicdropdownmenu-item")
        .forEach((b) =>
          b.classList.toggle(
            "active",
            b.textContent.includes(toImperial ? "Fahrenheit" : "Celsius")
          )
        );
      groups[1]
        .querySelectorAll(".magicdropdownmenu-item")
        .forEach((b) =>
          b.classList.toggle(
            "active",
            b.textContent.includes(toImperial ? "mph" : "km/h")
          )
        );
      groups[2]
        .querySelectorAll(".magicdropdownmenu-item")
        .forEach((b) =>
          b.classList.toggle(
            "active",
            b.textContent.includes(toImperial ? "Inches" : "Millimeters")
          )
        );
      fetchAndRender();
    };
  }
}

// ======= Search =======
els.searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = (els.searchInput.value || "").trim();
  if (!q) return;
  try {
    startLoading();
    const loc = await geocode(q);
    state.location = loc;
    state.selectedDayIndex = 0;
    await fetchAndRender();
    els.searchInput.value = "";
  } catch (err) {
    showError("Couldn't find that place. Try another name.");
  } finally {
    stopLoading();
  }
});

// ======= Fetch & Render master =======
async function fetchAndRender() {
  try {
    hide(els.apiError);
    const url = buildForecastURL(state.location, state);
    const res = await fetch(url);
    if (!res.ok) throw new Error("api-failed");
    const json = await res.json();
    state.data = json;

    renderToday(json);
    renderDaily(json);
    renderHourly(json);
  } catch (err) {
    showError("We couldn't connect to the weather service. Please try again.");
  }
}

// ======= Error/Loading helpers =======
function showError(msg) {
  if (els.apiError) {
    els.apiError.querySelector("p").textContent = msg;
    show(els.apiError);
  }
}
function startLoading() {
  document.body.style.opacity = "0.7";
}
function stopLoading() {
  document.body.style.opacity = "1";
}

// ======= Init =======
function tryGeolocate() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.location = {
          name: "Your location",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        resolve(true);
      },
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

async function init() {
  // پیش‌فرض Rasht در HTML شما هست؛ اینجا سعی می‌کنیم GeoLocation بگیریم
  await tryGeolocate();
  bindUnitOptions();

  // هندل retry در باکس خطا
  const retryBtn = document.querySelector(".api-error-state button");
  if (retryBtn) retryBtn.onclick = fetchAndRender;

  fetchAndRender();
}

init();

/* ====== Temperature Unit Label Toggle (Display-only) ====== */
/* فقط برچسب °C/°F را کنار عددها عوض می‌کند؛ مقدارها را دست نمی‌زند. */

(() => {
  let tempSymbol = "°C";

  const stripCF = (s) => String(s).replace(/\s*(?:°\s*[CF])\s*$/i, "");

  const applySymbol = (el) => {
    if (!el) return;
    el.textContent = stripCF(el.textContent) + tempSymbol;
  };

  function updateTempSymbols() {
    document
      .querySelectorAll(
        ".today-weather-temp, .Hourly-forecast-temp, .high-temp, .low-temp"
      )
      .forEach(applySymbol);

    // Feels Like = اولین کارت مقادیر وضعیت
    const states = document.querySelectorAll(".weather-states-card-value");
    if (states[0]) applySymbol(states[0]);
  }

  // کمک: یک‌جا سمبل را ست کن + اکتیوکردن آیتم‌های منو
  function setTempSymbol(symbol) {
    tempSymbol = symbol; // '°C' | '°F'
    // اکتیو منوی Temperature
    const tempItems = document.querySelectorAll(
      ".magicdropdownmenu-units .magicdropdownmenu-choose:nth-of-type(1) .magicdropdownmenu-item"
    );
    tempItems.forEach((b) => b.classList.remove("active"));
    const target = Array.from(tempItems).find((b) =>
      tempSymbol === "°F"
        ? /Fahrenheit/i.test(b.textContent)
        : /Celsius/i.test(b.textContent)
    );
    if (target) target.classList.add("active");

    updateTempSymbols();
  }

  function wireUnitsTemperatureToggle() {
    const tempItems = document.querySelectorAll(
      ".magicdropdownmenu-units .magicdropdownmenu-choose:nth-of-type(1) .magicdropdownmenu-item"
    );
    const switchBtn = document.querySelector(
      ".magicdropdownmenu-units .magicdropdownmenu-btn"
    );
    const unitsMenu = document.querySelector(".magicdropdownmenu-units");

    // کلیک روی آیتم‌های Temperature (C/F)
    tempItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        setTempSymbol(/Fahrenheit/i.test(btn.textContent) ? "°F" : "°C");
      });
    });

    // ⚡️ کلیک روی دکمه‌ی "Switch to Imperial/Metric"
    if (switchBtn) {
      switchBtn.addEventListener("click", () => {
        setTempSymbol(tempSymbol === "°C" ? "°F" : "°C");
        // اگر منو رو بعد از سوییچ می‌خوای بسته بشه (اختیاری):
        if (unitsMenu) unitsMenu.style.display = "none";
      });
    }

    // اگر دکمه‌ی بالای هدر برای باز/بستن منو داری، تغییری لازم نیست.
  }

  function observeDynamicRenders() {
    const container = document.querySelector(".main-content") || document.body;
    const observer = new MutationObserver((mutations) => {
      const needsUpdate = mutations.some((m) =>
        Array.from(m.addedNodes || []).some(
          (n) =>
            n.nodeType === 1 &&
            (n.matches?.(".Hourly-forecast-card, .day-card, .today-weather") ||
              n.querySelector?.(
                ".today-weather-temp, .Hourly-forecast-temp, .high-temp, .low-temp, .weather-states-card-value"
              ))
        )
      );
      if (needsUpdate) updateTempSymbols();
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    wireUnitsTemperatureToggle();
    // مقدار پیش‌فرض صفحه معمولاً سلسیوسه
    setTempSymbol("°C"); // اگر لازم بود '°F' بگذار
    observeDynamicRenders();
  });

  // در صورت نیاز، برای رندرهای دستی خودت:
  window.__updateTempSymbols = updateTempSymbols;
  window.__setTempSymbol = setTempSymbol;
})();
