/**
 * NERA 2.0 - Multilingual & Localization Service (i18n)
 * Supports: English, Hindi, Assamese (অসমীয়া), Bengali (বাংলা)
 * Instant dynamic translation without page reloading.
 */

export const TRANSLATIONS = {
  en: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_map: "Risk Map",
    nav_alerts: "Alerts",
    nav_analytics: "Analytics",
    nav_reports: "Reports",
    nav_about: "About",
    nav_login: "Login",
    nav_logout: "Logout",
    nav_profile: "Profile",
    nav_my_reports: "My Reports",
    nav_monsoon: "Monsoon Mode",

    // System Meta & Topbar
    topbar_emergency: "EMERGENCY",
    emergency_modal_eyebrow: "CRITICAL ADVISORY ACTION",
    emergency_modal_title: "Emergency Alert",
    emergency_prompt: "Are you sure you want to trigger an emergency alert?",
    emergency_location_label: "Location & Coordinates",
    emergency_notice: "Notice: Triggering an emergency alert dispatches an immediate critical advisory to disaster response authorities and marks this location for rapid field verification.",
    btn_confirm_emergency: "Confirm Emergency",
    topbar_system_operational: "System operational",
    topbar_updated: "Updated",

    // Risk Levels
    risk_low: "Low",
    risk_moderate: "Moderate",
    risk_high: "High",
    risk_critical: "Critical",

    // Header & Titles
    app_title: "NERA 2.0 — North East Landslide Early Warning",
    app_subtitle: "AI-Powered Multi-Hazard Decision Support System",

    // Hero Section
    hero_pill: "NERA 2.0 Operational Monitoring · 8 NER States",
    hero_title: "AI-Powered Landslide Early Warning for North East India",
    hero_desc: "Continuous geotechnical intelligence, satellite radar deformation monitoring, and real-time citizen reporting for disaster risk reduction across Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura.",
    hero_btn_view_map: "View Map",
    hero_btn_map: "View Live Risk Map",
    hero_btn_report: "Report Incident",
    hero_stat_states: "NER States Monitored",
    hero_stat_factors: "AI Geotechnical Model",
    hero_stat_engine: "PostGIS + SQLite Engine",

    // Regional Status Strip
    strip_regional_assessment: "Regional assessment",
    strip_districts_attention: "districts require attention",
    strip_active_alerts: "Active alerts",
    strip_high_risk: "High-risk locations",
    strip_rainfall_status: "Rainfall status",
    strip_data_freshness: "Data freshness",
    strip_data_simulated: "Demo / simulated data",

    // Map Section
    map_eyebrow: "Operational GIS view",
    map_title: "North Eastern Region risk map",
    map_caption: "Regional operational overview · 8 NER states (Survey of India / DataMeet boundary overlay)",
    map_fullscreen_heading: "North Eastern Region · Landslide Operational Map",
    legend_low: "Low",
    legend_moderate: "Moderate",
    legend_high: "High",
    legend_critical: "Critical",
    panel_location_assessment: "Location assessment",
    btn_reset: "Reset",
    btn_view_map: "View Map",
    btn_back_to_dashboard: "Back to Dashboard",

    // Tools
    btn_tools: "🛠️ Tools ▾",
    tool_whatif: "⚡ What-If Simulator",
    tool_route: "🛣️ Safest Route",
    tool_villages: "🏘️ Top Villages",
    tool_sensors: "📡 IoT Sensors",
    tool_volunteers: "🤝 Volunteers",
    tool_broadcast: "🚨 Broadcast Demo",
    tool_vehicle: "🚑 Vehicle Tracker (Demo)",
    tool_officer: "🛡️ Officer Portal",
    monsoon_label: "🌧️ Mode:",

    // Layers Panel
    layer_panel_title: "NERA RISK & MONITORING LAYERS",
    layer_boundaries: "NER State Boundaries",
    layer_risk: "Landslide Risk",
    layer_rainfall: "Rainfall",
    layer_soil_moisture: "Soil Moisture",
    layer_slope: "Slope",
    layer_history: "Historical Landslides",
    layer_reports: "Community Reports",
    layer_roads: "Roads",
    layer_infra: "Critical Infrastructure",

    // Alerts Section
    alerts_eyebrow: "Early warning",
    alerts_title: "Active advisories",
    btn_view_all_alerts: "View all alerts",
    no_active_alerts: "No active alerts at this time.",

    // Weather & Environment
    weather_eyebrow: "Weather & environment",
    weather_title: "Regional conditions",
    weather_last24: "Last 24 hours",
    metrics_rainfall: "Rainfall",
    metrics_soil: "Soil moisture",
    metrics_temp: "Temperature",
    metrics_humidity: "Humidity",
    chart_accumulation: "Rainfall accumulation",
    chart_days: "24h / 7-day",

    // Analytics
    prediction_eyebrow: "AI/ML Risk Prediction",
    prediction_title: "Regional Landslide Risk Index",
    prediction_muted: "6-factor geotechnical inputs: 24h rainfall, soil moisture, slope gradient, digital elevation, historical inventory, and InSAR deformation.",
    prediction_disclaimer: "Illustrative calibrated model output — not a certified live warning.",
    state_bars_eyebrow: "State-wise risk",
    state_bars_title: "Current distribution",
    satellite_eyebrow: "Earth observation",
    satellite_title: "Satellite data readiness",

    // State Monitoring Table
    table_eyebrow: "State-wise monitoring",
    table_title: "NER situation register",
    table_hint: "Select a row to locate on map",
    th_state: "State",
    th_risk: "Risk level",
    th_score: "Score",
    th_rain: "Rainfall",
    th_alerts: "Active alerts",
    th_updated: "Last updated",

    // Historical Section
    history_eyebrow: "Historical landslide data",
    history_title: "Reference events",
    th_location: "Location",
    th_date: "Date",
    th_severity: "Severity",
    th_trigger: "Trigger",
    history_footnote: "Historical records inform model training and validation. Sources must be verified before operational use.",

    // Reports Section
    reports_eyebrow: "Reports & Field Intelligence",
    reports_title: "Ground Incident Reports",
    btn_refresh: "Refresh",
    standard_registers: "Standard Registers",
    report_daily: "Daily Risk Report",
    report_weekly: "Weekly Risk Summary",
    report_statewise: "State-wise Risk Report",

    // About Section
    about_eyebrow: "About & methodology",
    about_title: "From observation to early warning",
    about_p1: "NER-Landslide is an AI-based early warning and risk monitoring platform designed to support landslide risk assessment across the eight North Eastern states of India. It combines rainfall, soil moisture, terrain, elevation, historical landslide information and remote-sensing observations with AI/ML-based risk analysis.",
    about_p2: "The platform presents area-level risk through an interactive GIS map, risk scores, alerts and community incident reports, helping authorities and communities make faster, better-informed decisions.",
    about_note: "Risk estimates are intended for decision support and should be validated against authoritative operational data before deployment.",

    // Methodology Steps
    meth_step1: "Satellite & Remote Sensing",
    meth_step2: "Rainfall, Soil Moisture & Terrain",
    meth_step3: "Data Processing",
    meth_step4: "AI/ML Risk Prediction",
    meth_step5: "Early Warning",

    // Footer
    footer_text: "NER-Landslide · Prototype • Demo / simulated data unless connected to an authoritative live source",

    // Modals - Incident Reporting
    modal_report_eyebrow: "Citizen Ground Intelligence",
    modal_report_title: "Submit Landslide Incident",
    lbl_fullname: "Full Name *",
    lbl_phone: "Contact Phone",
    lbl_classification: "Incident Classification *",
    lbl_gps: "GPS Coordinates *",
    btn_use_gps: "Use GPS",
    gps_help: "Auto-detect or click anywhere on the Risk Map to pinpoint location.",
    lbl_description: "Description & Observations *",
    lbl_photo: "Attach Photo / Documentation",
    lbl_anonymous_report: "Submit Anonymously (Hide Name & Contact on public map)",
    btn_cancel: "Cancel",
    btn_submit_report: "Submit Report",

    // Modals - Login & Auth
    modal_login_eyebrow: "Sign In",
    modal_login_title: "Welcome to NERA",
    auth_welcome_sub: "Sign in to access personalized features and submit incident reports.",
    btn_google_signin: "Continue with Google",
    auth_security_note: "Your Google account is used only to authenticate your NERA account.",
    auth_divider_email: "OR EMAIL",
    lbl_email: "Email Address",
    lbl_password: "Password",
    btn_login_submit: "Sign In",

    // Modals - What-If & Advanced
    modal_whatif_title: "Interactive What-If Landslide Simulator",
    modal_whatif_desc: "Simulate extreme weather scenarios and observe physics-based slope hazard projections.",
    modal_evac_title: "Evacuation Corridor & Safest Route",
    modal_evac_desc: "Algorithmic mountain route optimization bypassing landslides and blocked national highways.",
    modal_villages_title: "Top 10 High-Risk Hill Villages",
    modal_sensors_title: "IoT Ground Sensor Telemetry Network",
    modal_officer_title: "Incident Command & Officer Portal",
    modal_volunteer_title: "NER Emergency Community Volunteer Directory",
    modal_dispatch_title: "Multi-Channel Emergency Alert Dispatcher",

    // Labels & Sliders
    lbl_rainfall: "24h Rainfall (mm)",
    lbl_soil: "Soil Moisture Saturation (%)",
    lbl_slope: "Slope Gradient (°)",
    lbl_monsoon_mode: "Season Mode",
    lbl_pre_monsoon: "Pre-Monsoon",
    lbl_peak_monsoon: "Peak Monsoon",
    lbl_post_monsoon: "Post-Monsoon",
    lbl_primary_trigger: "Primary Hazard Trigger",
    lbl_xai_factors: "Explainable AI (XAI) Factor Breakdown",
    lbl_cascade_risk: "Downstream Cascade Probability",
    lbl_recommended_action: "Recommended Inter-Agency Action",
    lbl_family_alert: "Linked Family Alert Group",

    // Status Notices
    notice_simulated: "DEMO / SIMULATED",
    notice_offline: "Offline Mode Active — Data Queued Locally",
    voice_playing: "Playing Voice Advisory..."
  },

  hi: {
    // Navigation
    nav_dashboard: "डैशबोर्ड",
    nav_map: "जोखिम मानचित्र",
    nav_alerts: "चेतावनी",
    nav_analytics: "एनालिटिक्स",
    nav_reports: "रिपोर्ट्स",
    nav_about: "परिचय",
    nav_login: "लॉग इन",
    nav_logout: "लॉग आउट",
    nav_profile: "प्रोफ़ाइल",
    nav_my_reports: "मेरी रिपोर्ट",
    nav_monsoon: "मानसून मोड",

    // System Meta & Topbar
    topbar_emergency: "आपातकालीन (112)",
    emergency_modal_eyebrow: "महत्वपूर्ण आपातकालीन कार्रवाई",
    emergency_modal_title: "आपातकालीन चेतावनी",
    emergency_prompt: "क्या आप वाकई आपातकालीन चेतावनी जारी करना चाहते हैं?",
    emergency_location_label: "स्थान एवं निर्देशांक",
    emergency_notice: "सूचना: आपातकालीन चेतावनी जारी करने से आपदा मोचन प्राधिकरणों को तत्काल परामर्श प्रेषित होता है।",
    btn_confirm_emergency: "आपातकाल की पुष्टि करें",
    topbar_system_operational: "सिस्टम सक्रिय है",
    topbar_updated: "अंतिम अपडेट",

    // Risk Levels
    risk_low: "निम्न (Low)",
    risk_moderate: "मध्यम (Moderate)",
    risk_high: "उच्च (High)",
    risk_critical: "गंभीर (Critical)",

    // Header & Titles
    app_title: "नेरा २.० — पूर्वोत्तर भूस्खलन पूर्व चेतावनी प्रणाली",
    app_subtitle: "एआई-संचालित बहु-आपदा निर्णय समर्थन प्रणाली",

    // Hero Section
    hero_pill: "नेरा २.० परिचालन निगरानी · ८ पूर्वोत्तर राज्य",
    hero_title: "पूर्वोत्तर भारत के लिए एआई-संचालित भूस्खलन पूर्व चेतावनी",
    hero_desc: "अरुणाचल प्रदेश, असम, मणिपुर, मेघालय, मिजोरम, नागालैंड, सिक्किम और त्रिपुरा में निरंतर भू-तकनीकी विश्लेषण, उपग्रह रडार विकृति निगरानी और आपदा जोखिम न्यूनीकरण के लिए त्वरित नागरिक रिपोर्टिंग।",
    hero_btn_view_map: "मानचित्र देखें",
    hero_btn_map: "लाइव जोखिम मानचित्र देखें",
    hero_btn_report: "घटना की सूचना दें",
    hero_stat_states: "पूर्वोत्तर राज्य निगरानी",
    hero_stat_factors: "एआई भू-तकनीकी मॉडल",
    hero_stat_engine: "स्थानिक विश्लेषण इंजन",

    // Regional Status Strip
    strip_regional_assessment: "क्षेत्रीय जोखिम मूल्यांकन",
    strip_districts_attention: "जिलों में विशेष सतर्कता आवश्यक",
    strip_active_alerts: "सक्रिय आपातकालीन अलर्ट",
    strip_high_risk: "उच्च जोखिम वाले स्थान",
    strip_rainfall_status: "वर्षा की स्थिति",
    strip_data_freshness: "डेटा की ताजगी",
    strip_data_simulated: "डेमो / सिमुलेटेड डेटा",

    // Map Section
    map_eyebrow: "परिचालन जीआईएस दृश्य",
    map_title: "पूर्वोत्तर क्षेत्र भूस्खलन जोखिम मानचित्र",
    map_caption: "क्षेत्रीय परिचालन अवलोकन · ८ पूर्वोत्तर राज्य (भारतीय सर्वेक्षण सीमा रेखा)",
    map_fullscreen_heading: "पूर्वोत्तर क्षेत्र · भूस्खलन परिचालन मानचित्र",
    legend_low: "निम्न",
    legend_moderate: "मध्यम",
    legend_high: "उच्च",
    legend_critical: "गंभीर",
    panel_location_assessment: "स्थान मूल्यांकन",
    btn_reset: "रीसेट",
    btn_view_map: "मानचित्र देखें",
    btn_back_to_dashboard: "डैशबोर्ड पर वापस जाएं",

    // Tools
    btn_tools: "🛠️ टूल्स ▾",
    tool_whatif: "⚡ सिमुलेटर (What-If)",
    tool_route: "🛣️ सुरक्षित निकासी मार्ग",
    tool_villages: "🏘️ उच्च जोखिम वाले गाँव",
    tool_sensors: "📡 आईओटी सेंसर",
    tool_volunteers: "🤝 स्वयंसेवक दल",
    tool_broadcast: "🚨 आपातकालीन प्रसारण",
    tool_vehicle: "🚑 आपातकालीन वाहन ट्रैकर (डेमो)",
    tool_officer: "🛡️ अधिकारी पोर्टल",
    monsoon_label: "🌧️ मोड:",

    // Layers Panel
    layer_panel_title: "नेरा जोखिम एवं निगरानी परतें",
    layer_boundaries: "पूर्वोत्तर राज्य सीमाएं",
    layer_risk: "भूस्खलन जोखिम",
    layer_rainfall: "वर्षा",
    layer_soil_moisture: "मृदा आर्द्रता",
    layer_slope: "ढलान",
    layer_history: "ऐतिहासिक भूस्खलन",
    layer_reports: "सामुदायिक रिपोर्ट",
    layer_roads: "सड़कें",
    layer_infra: "महत्वपूर्ण बुनियादी ढांचा",

    // Alerts Section
    alerts_eyebrow: "पूर्व चेतावनी",
    alerts_title: "सक्रिय आपातकालीन सलाह",
    btn_view_all_alerts: "सभी अलर्ट देखें",
    no_active_alerts: "वर्तमान में कोई सक्रिय अलर्ट नहीं है।",

    // Weather & Environment
    weather_eyebrow: "मौसम एवं पर्यावरण",
    weather_title: "क्षेत्रीय मौसमी परिस्थितियाँ",
    weather_last24: "पिछले २४ घंटे",
    metrics_rainfall: "वर्षा",
    metrics_soil: "मिट्टी की नमी",
    metrics_temp: "तापमान",
    metrics_humidity: "आर्द्रता",
    chart_accumulation: "वर्षा संचय",
    chart_days: "२४ घंटे / ७ दिन",

    // Analytics
    prediction_eyebrow: "एआई/एमएल जोखिम भविष्यवाणी",
    prediction_title: "क्षेत्रीय भूस्खलन जोखिम सूचकांक",
    prediction_muted: "६-कारक भू-तकनीकी इनपुट: २४ घंटे वर्षा, मिट्टी की नमी, ढलान प्रवणता, ऊंचाई, ऐतिहासिक भूस्खलन रिकॉर्ड और उपग्रह विरूपण।",
    prediction_disclaimer: "निर्णय समर्थन हेतु अंशांकित मॉडल परिणाम — आधिकारिक चेतावनी नहीं।",
    state_bars_eyebrow: "राज्यवार जोखिम",
    state_bars_title: "वर्तमान जोखिम वितरण",
    satellite_eyebrow: "पृथ्वी अवलोकन",
    satellite_title: "उपग्रह डेटा तत्परता",

    // State Monitoring Table
    table_eyebrow: "राज्यवार निगरानी",
    table_title: "पूर्वोत्तर स्थिति रजिस्टर",
    table_hint: "मानचित्र पर स्थान देखने के लिए पंक्ति चुनें",
    th_state: "राज्य",
    th_risk: "जोखिम स्तर",
    th_score: "स्कोर",
    th_rain: "वर्षा",
    th_alerts: "सक्रिय अलर्ट",
    th_updated: "अंतिम अपडेट",

    // Historical Section
    history_eyebrow: "ऐतिहासिक भूस्खलन डेटा",
    history_title: "संदर्भ घटनाएँ",
    th_location: "स्थान",
    th_date: "दिनांक",
    th_severity: "गंभीरता",
    th_trigger: "कारण / ट्रिगर",
    history_footnote: "ऐतिहासिक रिकॉर्ड मॉडल प्रशिक्षण और सत्यापन का आधार हैं।",

    // Reports Section
    reports_eyebrow: "रिपोर्ट एवं क्षेत्रीय खुफिया",
    reports_title: "जमीनी घटना रिपोर्ट",
    btn_refresh: "ताज़ा करें",
    standard_registers: "मानक रजिस्टर",
    report_daily: "दैनिक जोखिम रिपोर्ट",
    report_weekly: "साप्ताहिक जोखिम सारांश",
    report_statewise: "राज्यवार जोखिम रिपोर्ट",

    // About Section
    about_eyebrow: "परिचय एवं कार्यप्रणाली",
    about_title: "अवलोकन से पूर्व चेतावनी तक",
    about_p1: "नेरा-लैंडस्लाइड भारत के आठ पूर्वोत्तर राज्यों में भूस्खलन जोखिम मूल्यांकन के लिए एक एआई-आधारित पूर्व चेतावनी प्रणाली है। यह वर्षा, मिट्टी की नमी, इलाके, ऊंचाई, ऐतिहासिक डेटा और रिमोट-सेंसिंग टिप्पणियों को एआई/एमएल विश्लेषण के साथ एकीकृत करता है।",
    about_p2: "यह मंच इंटरैक्टिव जीआईएस मानचित्र, जोखिम स्कोर, अलर्ट और सामुदायिक रिपोर्ट के माध्यम से क्षेत्र-स्तरीय जोखिम प्रस्तुत करता है, जिससे त्वरित निर्णय लेने में सहायता मिलती है।",
    about_note: "जोखिम अनुमान निर्णय समर्थन के लिए हैं और आधिकारिक परिचालन डेटा से सत्यापित होने चाहिए।",

    // Methodology Steps
    meth_step1: "उपग्रह एवं रिमोट सेंसिंग",
    meth_step2: "वर्षा, मिट्टी की नमी एवं इलाके",
    meth_step3: "डेटा प्रसंस्करण",
    meth_step4: "एआई/एमएल जोखिम भविष्यवाणी",
    meth_step5: "त्वरित पूर्व चेतावनी",

    // Footer
    footer_text: "नेरा-लैंडस्लाइड · प्रोटोटाइप • आधिकारिक स्रोत से जुड़े होने तक डेमो / सिमुलेटेड डेटा",

    // Modals - Incident Reporting
    modal_report_eyebrow: "नागरिक भू-खुफिया",
    modal_report_title: "भूस्खलन घटना की सूचना दर्ज करें",
    lbl_fullname: "पूरा नाम *",
    lbl_phone: "संपर्क फ़ोन नंबर",
    lbl_classification: "घटना का वर्गीकरण *",
    lbl_gps: "जीपीएस निर्देशांक *",
    btn_use_gps: "जीपीएस का उपयोग करें",
    gps_help: "स्वचालित रूप से प्राप्त करें या स्थान चिन्हित करने के लिए मानचित्र पर क्लिक करें।",
    lbl_description: "विवरण एवं अवलोकन *",
    lbl_photo: "फोटो या दस्तावेज़ संलग्न करें",
    lbl_anonymous_report: "गुमनाम रूप से सबमिट करें (मानचित्र पर नाम व संपर्क छुपाएं)",
    btn_cancel: "रद्द करें",
    btn_submit_report: "रिपोर्ट सबमिट करें",

    // Modals - Login & Auth
    modal_login_eyebrow: "साइन इन",
    modal_login_title: "नेरा में आपका स्वागत है",
    auth_welcome_sub: "व्यक्तिगत सुविधाओं का उपयोग करने और रिपोर्ट दर्ज करने के लिए साइन इन करें।",
    btn_google_signin: "गूगल के साथ जारी रखें",
    auth_security_note: "आपके गूगल खाते का उपयोग केवल नेरा खाते को प्रमाणित करने के लिए किया जाता है।",
    auth_divider_email: "या ईमेल द्वारा",
    lbl_email: "ईमेल पता",
    lbl_password: "पासवर्ड",
    btn_login_submit: "साइन इन करें",

    // Modals - What-If & Advanced
    modal_whatif_title: "इंटरैक्टिव व्हाट-इफ भूस्खलन सिमुलेटर",
    modal_whatif_desc: "चरम मौसम परिदृश्यों का अनुकरण करें और ढलान स्थिरता पूर्वानुमान देखें।",
    modal_evac_title: "निकासी गलियारा एवं सुरक्षित मार्ग",
    modal_evac_desc: "भूस्खलन और अवरुद्ध राजमार्गों से बचने के लिए पहाड़ी मार्ग अनुकूलन।",
    modal_villages_title: "शीर्ष १० उच्च जोखिम वाले पहाड़ी गाँव",
    modal_sensors_title: "आईओटी ग्राउंड सेंसर टेलीमेट्री नेटवर्क",
    modal_officer_title: "घटना कमान एवं अधिकारी पोर्टल",
    modal_volunteer_title: "पूर्वोत्तर आपातकालीन सामुदायिक स्वयंसेवक निर्देशिका",
    modal_dispatch_title: "बहु-चैनल आपातकालीन चेतावनी प्रेषक",

    // Labels & Sliders
    lbl_rainfall: "२४ घंटे वर्षा (मिमी)",
    lbl_soil: "मिट्टी की नमी संतृप्ति (%)",
    lbl_slope: "ढलान प्रवणता (°)",
    lbl_monsoon_mode: "ऋतु मोड",
    lbl_pre_monsoon: "मानसून पूर्व",
    lbl_peak_monsoon: "मुख्य मानसून",
    lbl_post_monsoon: "मानसून पश्चात",
    lbl_primary_trigger: "प्राथमिक जोखिम कारक",
    lbl_xai_factors: "व्याख्यात्मक एआई (XAI) कारक विश्लेषण",
    lbl_cascade_risk: "डाउनस्ट्रीम मलबे का बहाव जोखिम",
    lbl_recommended_action: "अनुशंसित अंतर-एजेंसी कार्रवाई",
    lbl_family_alert: "लिंक किया गया पारिवारिक अलर्ट समूह",

    // Status Notices
    notice_simulated: "डेमो / सिमुलेटेड",
    notice_offline: "ऑफ़लाइन मोड सक्रिय — डिवाइस में सुरक्षित",
    voice_playing: "आवाज अलर्ट चलाया जा रहा है..."
  },

  as: {
    // Navigation
    nav_dashboard: "ডেশ্বৰ্ড",
    nav_map: "বিপদ মানচিত্ৰ",
    nav_alerts: "সতৰ্কবাণী",
    nav_analytics: "বিশ্লেষণ",
    nav_reports: "প্ৰতিবেদন",
    nav_about: "পৰিচয়",
    nav_login: "লগ ইন",
    nav_logout: "লগ আউট",
    nav_profile: "প্ৰফাইল",
    nav_my_reports: "মোৰ প্ৰতিবেদন",
    nav_monsoon: "বাৰিষা মোড",

    // System Meta & Topbar
    topbar_emergency: "জৰুৰীকালীন (112)",
    emergency_modal_eyebrow: "সংকটজনক জৰুৰী ব্যৱস্থা",
    emergency_modal_title: "জৰুৰীকালীন সতৰ্কবাৰ্তা",
    emergency_prompt: "আপুনি নিশ্চিতভাৱে জৰুৰী সতৰ্কবাৰ্তা প্ৰেৰণ কৰিব বিচাৰেনে?",
    emergency_location_label: "স্থান আৰু স্থানাংক",
    emergency_notice: "সূচনা: জৰুৰীকালীন সতৰ্কবাৰ্তা প্ৰেৰণ কৰিলে দুৰ্যোগ ব্যৱস্থাপনা কৰ্তৃপক্ষলৈ তাৎক্ষণিক নিৰ্দেশনা প্ৰেৰণ কৰা হয়।",
    btn_confirm_emergency: "জৰুৰীকালীন নিশ্চিত কৰক",
    topbar_system_operational: "ব্যৱস্থা সক্ৰিয়",
    topbar_updated: "শেহতীয়া আপডেট",

    // Risk Levels
    risk_low: "কম (Low)",
    risk_moderate: "মধ্যম (Moderate)",
    risk_high: "উচ্চ (High)",
    risk_critical: "সংকটজনক (Critical)",

    // Header & Titles
    app_title: "নেৰা ২.০ — উত্তৰ-পূব ভূমিস্খলন পূৰ্ব সতৰ্কবাণী",
    app_subtitle: "এআই-চালিত বহু-বিপদ সিদ্ধান্ত সহায়ক ব্যৱস্থা",

    // Hero Section
    hero_pill: "নেৰা ২.০ কাৰ্যকৰী নিৰীক্ষণ · ৮ খন উত্তৰ-পূব ৰাজ্য",
    hero_title: "উত্তৰ-পূব ভাৰতৰ বাবে এআই-চালিত ভূমিস্খলন পূৰ্ব সতৰ্কবাণী",
    hero_desc: "অৰুণাচল প্ৰদেশ, অসম, মণিপুৰ, মেঘালয়, মিজোৰাম, নাগালেণ্ড, ছিকিম আৰু ত্ৰিপুৰাত অবিৰত ভূ-কাৰিকৰী বিশ্লেষণ, উপগ্ৰহ ৰাডাৰ বিকৃতি নিৰীক্ষণ আৰু দুৰ্যোগ প্ৰশমনৰ বাবে ৰাইজৰ প্ৰত্যক্ষ প্ৰতিবেদন।",
    hero_btn_view_map: "মানচিত্ৰ চাওক",
    hero_btn_map: "লাইভ বিপদ মানচিত্ৰ চাওক",
    hero_btn_report: "ঘটনাৰ খবৰ দিয়ক",
    hero_stat_states: "উত্তৰ-পূব ৰাজ্য নিৰীক্ষণ",
    hero_stat_factors: "এআই ভূ-কাৰিকৰী মডেল",
    hero_stat_engine: "দ্বৈত স্থানিক ইঞ্জিন",

    // Regional Status Strip
    strip_regional_assessment: "আঞ্চলিক বিপদ মূল্যায়ন",
    strip_districts_attention: "জিলাত বিশেষ সতৰ্কতাৰ প্ৰয়োজন",
    strip_active_alerts: "সক্ৰিয় জৰুৰী সতৰ্কতা",
    strip_high_risk: "উচ্চ সংকটপূৰ্ণ স্থান",
    strip_rainfall_status: "বৰষুণৰ অৱস্থা",
    strip_data_freshness: "তথ্যৰ সতেজতা",
    strip_data_simulated: "ডেমো / ছিমুলেটেড তথ্য",

    // Map Section
    map_eyebrow: "কাৰ্যকৰী জিআইএছ দৃশ্য",
    map_title: "উত্তৰ-পূব অঞ্চলৰ ভূমিস্খলন বিপদ মানচিত্ৰ",
    map_caption: "আঞ্চলিক কাৰ্যকৰী দৃশ্য · ৮ খন উত্তৰ-পূব ৰাজ্য (ভাৰতীয় জৰীপ সীমা)",
    map_fullscreen_heading: "উত্তৰ-পূব অঞ্চল · ভূমিস্খলন কাৰ্য্যকৰী মানচিত্ৰ",
    legend_low: "কম",
    legend_moderate: "মধ্যম",
    legend_high: "উচ্চ",
    legend_critical: "সংকটজনক",
    panel_location_assessment: "স্থান মূল্যায়ন",
    btn_reset: "পুনৰ সংস্থাপন",
    btn_view_map: "মানচিত্ৰ চাওক",
    btn_back_to_dashboard: "ডেশ্ববৰ্ডলৈ উভতি যাওক",

    // Tools
    btn_tools: "🛠️ সঁজুলি ▾",
    tool_whatif: "⚡ ছিমুলেটৰ (What-If)",
    tool_route: "🛣️ সুৰক্ষিত পথ",
    tool_villages: "🏘️ সংকটপূৰ্ণ গাঁওসমূহ",
    tool_sensors: "📡 আইঅ'টি সংবেদনশীল যন্ত্ৰ",
    tool_volunteers: "🤝 স্বেচ্ছাসেৱক গোট",
    tool_broadcast: "🚨 জৰুৰীকালীন প্ৰচাৰ",
    tool_vehicle: "🚑 বাহন ট্ৰেকাৰ (ডেমো)",
    tool_officer: "🛡️ বিষয়াৰ পৰ্টেল",
    monsoon_label: "🌧️ অৱস্থা:",

    // Layers Panel
    layer_panel_title: "নেৰা বিপদ আৰু নিৰীক্ষণ স্তৰ",
    layer_boundaries: "উত্তৰ-পূব ৰাজ্যিক সীমা",
    layer_risk: "ভূমিস্খলনৰ বিপদ",
    layer_rainfall: "বৰষুণ",
    layer_soil_moisture: "মাটিৰ আৰ্দ্ৰতা",
    layer_slope: "ঢাল",
    layer_history: "ঐতিহাসিক ভূমিস্খলন",
    layer_reports: "ৰাইজৰ প্ৰতিবেদন",
    layer_roads: "পথসমূহ",
    layer_infra: "গুৰুত্বপূৰ্ণ আন্তঃগাঁথনি",

    // Alerts Section
    alerts_eyebrow: "পূৰ্ব সতৰ্কবাণী",
    alerts_title: "সক্ৰিয় জৰুৰী পৰামৰ্শ",
    btn_view_all_alerts: "সকলো সতৰ্কবাণী চাওক",
    no_active_alerts: "বৰ্তমান কোনো সক্ৰিয় সতৰ্কবাণী নাই।",

    // Weather & Environment
    weather_eyebrow: "বতৰ আৰু পৰিৱেশ",
    weather_title: "আঞ্চলিক পৰিস্থিতি",
    weather_last24: "বিগত ২৪ ঘণ্টা",
    metrics_rainfall: "বৰষুণ",
    metrics_soil: "মাটিৰ আৰ্দ্ৰতা",
    metrics_temp: "উত্তাপ",
    metrics_humidity: "আৰ্দ্ৰতা",
    chart_accumulation: "বৰষুণৰ জমা",
    chart_days: "২৪ ঘণ্টা / ৭ দিন",

    // Analytics
    prediction_eyebrow: "এআই/এমএল বিপদ পূৰ্বানুমান",
    prediction_title: "আঞ্চলিক ভূমিস্খলন বিপদ সূচক",
    prediction_muted: "৬ টা ভূ-কাৰিকৰী মাপকাঠী: ২৪ ঘণ্টাৰ বৰষুণ, মাটিৰ আৰ্দ্ৰতা, পাহাৰৰ ঢাল, উচ্চতা, ঐতিহাসিক তথ্য আৰু উপগ্ৰহ বিকৃতি।",
    prediction_disclaimer: "সিদ্ধান্ত গ্ৰহণত সহায়ক হোৱাকৈ প্ৰস্তুত কৰা মডেলৰ ফলাফল — চৰকাৰী সতৰ্কবাণী নহয়।",
    state_bars_eyebrow: "ৰাজ্যভিত্তিক বিপদ",
    state_bars_title: "বৰ্তমান বিতৰণ",
    satellite_eyebrow: "পৃথিৱী পৰ্যবেক্ষণ",
    satellite_title: "উপগ্ৰহ তথ্যৰ প্ৰস্তুতি",

    // State Monitoring Table
    table_eyebrow: "ৰাজ্যভিত্তিক নিৰীক্ষণ",
    table_title: "উত্তৰ-পূব স্থিতি পঞ্জী",
    table_hint: "মানচিত্ৰত স্থান চাবলৈ শাৰী বাছক",
    th_state: "ৰাজ্য",
    th_risk: "বিপদৰ মাত্ৰা",
    th_score: "নম্বৰ",
    th_rain: "বৰষুণ",
    th_alerts: "সক্ৰিয় সতৰ্কতা",
    th_updated: "শেহতীয়া আপডেট",

    // Historical Section
    history_eyebrow: "ঐতিহাসিক ভূমিস্খলন তথ্য",
    history_title: "পূৰ্বৰ ঘটনাসমূহ",
    th_location: "স্থান",
    th_date: "তাৰিখ",
    th_severity: "মাত্ৰা",
    th_trigger: "কাৰণ",
    history_footnote: "পূৰ্বৰ ঘটনাৰ তথ্যই মডেল প্ৰশিক্ষণ আৰু প্ৰমাণীকৰণত সহায় কৰে।",

    // Reports Section
    reports_eyebrow: "প্ৰতিবেদন আৰু তথ্য",
    reports_title: "স্থানীয় ঘটনাৰ প্ৰতিবেদন",
    btn_refresh: "নতুনকৈ লোড কৰক",
    standard_registers: "মান্য পঞ্জীসমূহ",
    report_daily: "দৈনিক বিপদ প্ৰতিবেদন",
    report_weekly: "সাপ্তাহিক বিপদ সাৰাংশ",
    report_statewise: "ৰাজ্যভিত্তিক বিপদ প্ৰতিবেদন",

    // About Section
    about_eyebrow: "পৰিচয় আৰু পদ্ধতি",
    about_title: "পৰ্যবেক্ষণৰ পৰা পূৰ্ব সতৰ্কবাণীলৈ",
    about_p1: "নেৰা-লেণ্ডশ্লাইড হৈছে ভাৰতৰ উত্তৰ-পূবৰ আঠখন ৰাজ্যত ভূমিস্খলনৰ বিপদ নিৰূপণৰ বাবে এক এআই-ভিত্তিক সতৰ্কবাণী প্লেটফৰ্ম। ই বৰষুণ, মাটিৰ আৰ্দ্ৰতা, ভূমিৰ প্ৰকৃতি, ঐতিহাসিক তথ্য আৰু ৰিম'ট-চেনচিং পৰ্যবেক্ষণক এআই/এমএল বিশ্লেষণৰ সৈতে একত্ৰিত কৰে।",
    about_p2: "এই প্লেটফৰ্মে ইন্টাৰেক্টিভ জিআইএছ মেপ, নম্বৰ, সতৰ্কবাণী আৰু স্থানীয় ঘটনা প্ৰতিবেদনৰ দ্বাৰা সংকটৰ বিষয়ে অৱগত কৰে, যাৰ দ্বাৰা প্ৰশাসনে ক্ষিপ্ৰ সিদ্ধান্ত ল'ব পাৰে।",
    about_note: "বিপদৰ পূৰ্বানুমান সিদ্ধান্ত গ্ৰহণৰ সহায়ক হিচাপে প্ৰস্তুত কৰা হৈছে আৰু ইয়াক প্ৰামাণিক তথ্যৰ সৈতে পৰীক্ষা কৰা উচিত।",

    // Methodology Steps
    meth_step1: "উপগ্ৰহ আৰু ৰিম'ট চেনচিং",
    meth_step2: "বৰষুণ, মাটিৰ আৰ্দ্ৰতা আৰু মাটিৰ প্ৰকৃতি",
    meth_step3: "তথ্য প্ৰক্ৰিয়াকৰণ",
    meth_step4: "এআই/এমএল বিপদ পূৰ্বানুমান",
    meth_step5: "ক্ষিপ্ৰ সতৰ্কবাণী",

    // Footer
    footer_text: "নেৰা-লেণ্ডশ্লাইড · প্ৰট'টাইপ • চৰকাৰী উৎসৰ সৈতে সংযোগ নোহোৱালৈকে ডেমো / ছিমুলেটেড তথ্য",

    // Modals - Incident Reporting
    modal_report_eyebrow: "নাগৰিকৰ প্ৰত্যক্ষ তথ্য",
    modal_report_title: "ভূমিস্খলনৰ ঘটনা দাখিল কৰক",
    lbl_fullname: "সম্পূৰ্ণ নাম *",
    lbl_phone: "যোগাযোগৰ ফোন নম্বৰ",
    lbl_classification: "ঘটনাৰ শ্ৰেণীবিভাজন *",
    lbl_gps: "জিআইএছ স্থানাংক *",
    btn_use_gps: "জিআইএছ ব্যৱহাৰ কৰক",
    gps_help: "স্বয়ংক্ৰিয়ভাৱে চিনাক্ত কৰক অথবা স্থান বাছিবলৈ মানচিত্ৰত ক্লিক কৰক।",
    lbl_description: "বিৱৰণ আৰু পৰ্যবেক্ষণ *",
    lbl_photo: "ফটো বা প্ৰমাণপত্ৰ সংলগ্ন কৰক",
    lbl_anonymous_report: "বেনামীভাৱে দাখিল কৰক (মানচিত্ৰত নাম লুকুৱাওক)",
    btn_cancel: "বাতিল কৰক",
    btn_submit_report: "প্ৰতিবেদন জমা দিয়ক",

    // Modals - Login & Auth
    modal_login_eyebrow: "ছাইন ইন",
    modal_login_title: "নেৰালৈ স্বাগতম",
    auth_welcome_sub: "ব্যক্তিগত সুবিধা লাভ কৰিবলৈ আৰু প্ৰতিবেদন দাখিল কৰিবলৈ অনুগ্ৰহ কৰি লগ ইন কৰক।",
    btn_google_signin: "Google ৰ সৈতে আগবাঢ়ক",
    auth_security_note: "আপোনাৰ Google একাউন্টটো কেৱল NERA একাউন্ট প্ৰমাণীকৰণৰ বাবে ব্যৱহাৰ কৰা হয়।",
    auth_divider_email: "অথবা ইমেইলযোগে",
    lbl_email: "ইমেইল ঠিকনা",
    lbl_password: "পাছৱৰ্ড",
    btn_login_submit: "ছাইন ইন কৰক",

    // Modals - What-If & Advanced
    modal_whatif_title: "ইন্টাৰেক্টিভ হোৱাট-ইফ ভূমিস্খলন ছিমুলেটৰ",
    modal_whatif_desc: "প্ৰতিকূল বতৰৰ পৰিস্থিতি সৃষ্টি কৰি পাহাৰৰ ঢালৰ স্থিৰতা পৰ্যবেক্ষণ কৰক।",
    modal_evac_title: "নিকাশী কৰিডৰ আৰু সুৰক্ষিত পথ",
    modal_evac_desc: "ভূমিস্খলন আৰু বন্ধ ঘাইপথ এৰাই চলিবলৈ পাহাৰীয়া বাটৰ পথ নিৰ্দেশনা।",
    modal_villages_title: "উচ্চ সংকটপূৰ্ণ ১০ খন পাহাৰীয়া গাঁও",
    modal_sensors_title: "আইঅ'টি ভূ-সংবেদক নেটৱৰ্ক",
    modal_officer_title: "ঘটনা নিয়ন্ত্ৰণ আৰু বিষয়াৰ পৰ্টেল",
    modal_volunteer_title: "উত্তৰ-পূব জৰুৰীকালীন স্বেচ্ছাসেৱকৰ তালিকা",
    modal_dispatch_title: "বহু-চেনেল জৰুৰী সতৰ্কবাণী প্ৰচাৰক",

    // Labels & Sliders
    lbl_rainfall: "২৪ ঘণ্টাৰ বৰষুণ (মিমি)",
    lbl_soil: "মাটিৰ আৰ্দ্ৰতা সংপৃক্তি (%)",
    lbl_slope: "পাহাৰৰ ঢাল (°)",
    lbl_monsoon_mode: "ঋতুৰ ধৰণ",
    lbl_pre_monsoon: "বাৰিষা পূৰ্ব",
    lbl_peak_monsoon: "পূৰ্ণ বাৰিষা",
    lbl_post_monsoon: "বাৰিষা উত্তৰ",
    lbl_primary_trigger: "মূল সংকট সৃষ্টিকাৰী কাৰক",
    lbl_xai_factors: "ব্যাখ্যামূলক এআই (XAI) কাৰক বিশ্লেষণ",
    lbl_cascade_risk: "নামনি অঞ্চলৰ ধ্বংসাৱশেষৰ সম্ভাৱনা",
    lbl_recommended_action: "প্ৰস্তাবিত জৰুৰী পদক্ষেপ",
    lbl_family_alert: "সংযুক্ত পৰিয়ালৰ সতৰ্কতা গোট",

    // Status Notices
    notice_simulated: "ডেমো / ছিমুলেটেড",
    notice_offline: "অফলাইন মোড সক্ৰিয় — ডিভাইচত সংৰক্ষিত",
    voice_playing: "কণ্ঠ সতৰ্কবাণী বজোৱা হৈছে..."
  },

  bn: {
    // Navigation
    nav_dashboard: "ড্যাশবোর্ড",
    nav_map: "ঝুঁকি মানচিত্র",
    nav_alerts: "সতর্কতা",
    nav_analytics: "বিশ্লেষণ",
    nav_reports: "প্রতিবেদন",
    nav_about: "পরিচিতি",
    nav_login: "লগ ইন",
    nav_logout: "লগ আউট",
    nav_profile: "প্রোফাইল",
    nav_my_reports: "আমার রিপোর্ট",
    nav_monsoon: "বর্ষা মোড",

    // System Meta & Topbar
    topbar_emergency: "জরুরীকালীন (112)",
    emergency_modal_eyebrow: "গুরুত্বপূর্ণ জরুরি পদক্ষেপ",
    emergency_modal_title: "জরুরি সতর্কতা",
    emergency_prompt: "আপনি কি নিশ্চিতভাবে একটি জরুরি সতর্কতা পাঠাতে চান?",
    emergency_location_label: "অবস্থান ও স্থানাঙ্ক",
    emergency_notice: "বিজ্ঞপ্তি: জরুরি সতর্কতা জারি করলে দুর্যোগ প্রতিক্রিয়া কর্তৃপক্ষের কাছে অবিলম্বে জরুরি নির্দেশ প্রেরিত হয়।",
    btn_confirm_emergency: "জরুরি অবস্থা নিশ্চিত করুন",
    topbar_system_operational: "সিস্টেম চালু আছে",
    topbar_updated: "সর্বশেষ আপডেট",

    // Risk Levels
    risk_low: "কম (Low)",
    risk_moderate: "মাঝারি (Moderate)",
    risk_high: "উচ্চ (High)",
    risk_critical: "সংকটজনক (Critical)",

    // Header & Titles
    app_title: "নেরা ২.০ — উত্তর-পূর্ব ভূমিধস পূর্বাভাস ও সতর্কতা",
    app_subtitle: "এআই-চালিত বহু-দুর্যোগ সিদ্ধান্ত গ্রহণ ব্যবস্থা",

    // Hero Section
    hero_pill: "নেরা ২.০ কার্যক্ষম পর্যবেক্ষণ · ৮টি উত্তর-পূর্ব রাজ্য",
    hero_title: "উত্তর-পূর্ব ভারতের জন্য এআই-চালিত ভূমিধস পূর্বাভাস ও সতর্কতা",
    hero_desc: "অরুণাচল প্রদেশ, আসাম, মণিপুর, মেঘালয়, মিজোরাম, নাগাল্যান্ড, সিকিম এবং ত্রিপুরায় দুর্যোগ ঝুঁকি হ্রাসের জন্য অবিচ্ছিন্ন ভূতাত্ত্বিক বিশ্লেষণ, স্যাটেলাইট রাডার পর্যবেক্ষণ ও নাগরিক প্রতিবেদন।",
    hero_btn_view_map: "মানচিত্র দেখুন",
    hero_btn_map: "লাইভ ঝুঁকি মানচিত্র দেখুন",
    hero_btn_report: "ঘটনার তথ্য দিন",
    hero_stat_states: "উত্তর-পূর্ব রাজ্য নজরদারি",
    hero_stat_factors: "এআই ভূতাত্ত্বিক মডেল",
    hero_stat_engine: "দ্বৈত স্থানিক ইঞ্জিন",

    // Regional Status Strip
    strip_regional_assessment: "আঞ্চলিক ঝুঁকি মূল্যায়ন",
    strip_districts_attention: "জেলায় জরুরি নজরদারি প্রয়োজন",
    strip_active_alerts: "সক্রিয় জরুরি সতর্কতা",
    strip_high_risk: "উচ্চ ঝুঁকিপূর্ণ এলাকা",
    strip_rainfall_status: "বৃষ্টিপাতের অবস্থা",
    strip_data_freshness: " তথ্যের সতেজতা",
    strip_data_simulated: "ডেমো / সিমুলেটেড ডেটা",

    // Map Section
    map_eyebrow: "কার্যক্ষম জিআইএস দৃশ্য",
    map_title: "উত্তর-পূর্বাঞ্চল ভূমিধস ঝুঁকি মানচিত্র",
    map_caption: "আঞ্চলিক কার্যক্ষম পর্যবেক্ষণ · ৮টি উত্তর-পূর্ব রাজ্য (সার্ভে অফ ইন্ডিয়া সীমানা)",
    map_fullscreen_heading: "উত্তর-পূর্ব অঞ্চল · ভূমিধস অপারেশনাল মানচিত্র",
    legend_low: "কম",
    legend_moderate: "মাঝারি",
    legend_high: "উচ্চ",
    legend_critical: "সংকটজনক",
    panel_location_assessment: "স্থান মূল্যায়ন",
    btn_reset: "রিসেট",
    btn_view_map: "মানচিত্র দেখুন",
    btn_back_to_dashboard: "ড্যাশবোর্ডে ফিরে যান",

    // Tools
    btn_tools: "🛠️ টুলস ▾",
    tool_whatif: "⚡ সিমুলেটর (What-If)",
    tool_route: "🛣️ নিরাপদ পথ",
    tool_villages: "🏘️ শীর্ষ ঝুঁকিপূর্ণ গ্রাম",
    tool_sensors: "📡 আইওটি সেন্সর",
    tool_volunteers: "🤝 স্বেচ্ছাসেবক দল",
    tool_broadcast: "🚨 জরুরি সম্প্রচার",
    tool_vehicle: "🚑 গাড়ি ট্র্যাকার (ডেমো)",
    tool_officer: "🛡️ অফিসার পোর্টাল",
    monsoon_label: "🌧️ মোড:",

    // Layers Panel
    layer_panel_title: "নেরা ঝুঁকি ও পর্যবেক্ষণ স্তর",
    layer_boundaries: "উত্তর-পূর্ব রাজ্য সীমানা",
    layer_risk: "ভূমিধস ঝুঁকি",
    layer_rainfall: "বৃষ্টিপাত",
    layer_soil_moisture: "মাটির আর্দ্রতা",
    layer_slope: "ঢাল",
    layer_history: "ঐতিহাসিক ভূমিধস",
    layer_reports: "নাগরিক রিপোর্ট",
    layer_roads: "সড়কসমূহ",
    layer_infra: "গুরুত্বপূর্ণ পরিকাঠামো",

    // Alerts Section
    alerts_eyebrow: "পূর্বাভাস ও সতর্কতা",
    alerts_title: "সক্রিয় জরুরি পরামর্শ",
    btn_view_all_alerts: "সকল সতর্কতা দেখুন",
    no_active_alerts: "বর্তমানে কোন সক্রিয় সতর্কতা নেই।",

    // Weather & Environment
    weather_eyebrow: "আবহাওয়া ও পরিবেশ",
    weather_title: "আঞ্চলিক পরিস্থিতি",
    weather_last24: "বিগত ২৪ ঘণ্টা",
    metrics_rainfall: "বৃষ্টিপাত",
    metrics_soil: "মাটির আর্দ্রতা",
    metrics_temp: "তাপমাত্রা",
    metrics_humidity: "আর্দ্রতা",
    chart_accumulation: "বৃষ্টিপাত সঞ্চয়",
    chart_days: "২৪ ঘণ্টা / ৭ দিন",

    // Analytics
    prediction_eyebrow: "এআই/এমএল ঝুঁকি পূর্বাভাস",
    prediction_title: "আঞ্চলিক ভূমিধস ঝুঁকি সূচক",
    prediction_muted: "৬টি ভূতাত্ত্বিক উপাদান: ২৪ ঘণ্টার বৃষ্টিপাত, মাটির আর্দ্রতা, ঢাল, উচ্চতা, ঐতিহাসিক তথ্য এবং স্যাটেলাইট রাডার পর্যবেক্ষণ।",
    prediction_disclaimer: "সিদ্ধান্ত গ্রহণের সহায়ক মডেলের ফলাফল — আনুষ্ঠানিক সরকারি সতর্কতা নয়।",
    state_bars_eyebrow: "রাজ্যভিত্তিক ঝুঁকি",
    state_bars_title: "বর্তমান ঝুঁকি বণ্টন",
    satellite_eyebrow: "ভূ-পর্যবেক্ষণ",
    satellite_title: "স্যাটেলাইট ডেটার প্রস্তুতি",

    // State Monitoring Table
    table_eyebrow: "রাজ্যভিত্তিক পর্যবেক্ষণ",
    table_title: "উত্তর-পূর্ব পরিস্থিতি রেজিস্টার",
    table_hint: "মানচিত্রে দেখতে সারি নির্বাচন করুন",
    th_state: "রাজ্য",
    th_risk: "ঝুঁকির মাত্রা",
    th_score: "স্কোর",
    th_rain: "বৃষ্টিপাত",
    th_alerts: "সক্রিয় সতর্কতা",
    th_updated: "সর্বশেষ আপডেট",

    // Historical Section
    history_eyebrow: "ঐতিহাসিক ভূমিধস তথ্য",
    history_title: "উল্লেখযোগ্য পূর্ববর্তী ঘটনা",
    th_location: "স্থান",
    th_date: "তারিখ",
    th_severity: "তীব্রতা",
    th_trigger: "কারণ",
    history_footnote: "পূর্ববর্তী রেকর্ড মডেল প্রশিক্ষণ ও কার্যকারিতা যাচাই করতে ব্যবহৃত হয়।",

    // Reports Section
    reports_eyebrow: "প্রতিবেদন ও মাঠপর্যায়ের তথ্য",
    reports_title: "মাঠপর্যায়ের ঘটনার প্রতিবেদন",
    btn_refresh: "রিফ্রেশ",
    standard_registers: "স্ট্যান্ডার্ড রেজিস্টার",
    report_daily: "দৈনিক ঝুঁকি প্রতিবেদন",
    report_weekly: "সাপ্তাহিক ঝুঁকি সারসংক্ষেপ",
    report_statewise: "রাজ্যভিত্তিক ঝুঁকি প্রতিবেদন",

    // About Section
    about_eyebrow: "পরিচিতি ও কার্যপদ্ধতি",
    about_title: "পর্যবেক্ষণ থেকে আগাম সতর্কবার্তা",
    about_p1: "নেরা-ল্যান্ডস্লাইড ভারতের আটটি উত্তর-পূর্ব রাজ্যে ভূমিধসের ঝুঁকি মূল্যায়নের জন্য একটি এআই-ভিত্তিক আগাম সতর্কতা প্ল্যাটফর্ম। এটি বৃষ্টিপাত, মাটির আর্দ্রতা, ভূপ্রকৃতি, ঐতিহাসিক তথ্য এবং উপগ্রহ পর্যবেক্ষণকে এআই/এমএল বিশ্লেষণের সাথে সংযুক্ত করে।",
    about_p2: "প্ল্যাটফর্মটি একটি ইন্টারেক্টিভ জিআইএস মানচিত্র, ঝুঁকি স্কোর, সতর্কতা এবং নাগরিক প্রতিবেদনের মাধ্যমে অঞ্চলভিত্তিক ঝুঁকি তুলে ধরে, যা দ্রুত সিদ্ধান্ত গ্রহণে সহায়তা করে।",
    about_note: "ঝুঁকির অনুমানগুলো সিদ্ধান্ত গ্রহণের সহায়ক এবং মোতায়েনের আগে আনুষ্ঠানিক তথ্যের সাথে যাচাই করা উচিত।",

    // Methodology Steps
    meth_step1: "স্যাটেলাইট ও রিমোট সেন্সিং",
    meth_step2: "বৃষ্টিপাত, মাটির আর্দ্রতা ও ভূপ্রকৃতি",
    meth_step3: "ডেটা প্রসেসিং",
    meth_step4: "এআই/এমএল ঝুঁকি পূর্বাভাস",
    meth_step5: "আগাম সতর্কবার্তা",

    // Footer
    footer_text: "নেরা-ল্যান্ডস্লাইড · প্রোটোটাইপ • সরকারি উৎসের সাথে সংযুক্ত না হওয়া পর্যন্ত ডেমো / সিমুলেটেড ডেটা",

    // Modals - Incident Reporting
    modal_report_eyebrow: "মাঠপর্যায়ের নাগরিক তথ্য",
    modal_report_title: "ভূমিধসের ঘটনা দাখিল করুন",
    lbl_fullname: "পুরো নাম *",
    lbl_phone: "যোগাযোগের ফোন নম্বর",
    lbl_classification: "ঘটনার শ্রেণীবিভাগ *",
    lbl_gps: "জিপিএস স্থানাঙ্ক *",
    btn_use_gps: "জিপিএস ব্যবহার করুন",
    gps_help: "স্বয়ংক্রিয়ভাবে শনাক্ত করুন অথবা মানচিত্রে ক্লিক করে অবস্থান চিহ্নিত করুন।",
    lbl_description: "বিবরণ ও পর্যবেক্ষণ *",
    lbl_photo: "ছবি বা প্রমাণপত্র সংযুক্ত করুন",
    lbl_anonymous_report: "বেনামে জমা দিন (মানচিত্রে নাম ও যোগাযোগ গোপন রাখুন)",
    btn_cancel: "বাতিল",
    btn_submit_report: "রিপোর্ট জমা দিন",

    // Modals - Login & Auth
    modal_login_eyebrow: "সাইন ইন",
    modal_login_title: "নেরাতে আপনাকে স্বাগতম",
    auth_welcome_sub: "ব্যক্তিগত সুবিধা ও ঘটনার প্রতিবেদন জমা দিতে সাইন ইন করুন।",
    btn_google_signin: "Google এর সাথে এগিয়ে যান",
    auth_security_note: "আপনার Google অ্যাকাউন্টটি শুধুমাত্র NERA অ্যাকাউন্ট যাচাই করতে ব্যবহৃত হয়।",
    auth_divider_email: "অথবা ইমেইল দ্বারা",
    lbl_email: "ইমেইল ঠিকানা",
    lbl_password: "পাসওয়ার্ড",
    btn_login_submit: "সাইন ইন করুন",

    // Modals - What-If & Advanced
    modal_whatif_title: "ইন্টারেক্টিভ হোয়াট-ইফ ভূমিধস সিমুলেটর",
    modal_whatif_desc: "প্রতিকূল আবহাওয়ার সিমুলেশন তৈরি করে পাহাড়ের ঢালের স্থায়িত্ব পর্যবেক্ষণ করুন।",
    modal_evac_title: "উদ্ধার করিডোর ও নিরাপদ পথ",
    modal_evac_desc: "ভূমিধস ও অবরুদ্ধ মহাসড়ক এড়িয়ে নিরাপদ পাহাড়ি পথ নির্দেশনা।",
    modal_villages_title: "শীর্ষ ১০টি ঝুঁকিপূর্ণ পাহাড়ি গ্রাম",
    modal_sensors_title: "আইওটি গ্রাউন্ড সেন্সর টেলিমেট্রি নেটওয়ার্ক",
    modal_officer_title: "ঘটনাস্থল নিয়ন্ত্রণ ও অফিসার পোর্টাল",
    modal_volunteer_title: "উত্তর-পূর্ব জরুরি স্বেচ্ছাসেবক ডিরেক্টরি",
    modal_dispatch_title: "বহু-মাধ্যম জরুরি সম্প্রচার ব্যবস্থা",

    // Labels & Sliders
    lbl_rainfall: "২৪ ঘণ্টার বৃষ্টিপাত (মিমি)",
    lbl_soil: "মাটির আর্দ্রতা সম্পৃক্তি (%)",
    lbl_slope: "পাহাড়ের ঢাল (°)",
    lbl_monsoon_mode: "ঋতু মোড",
    lbl_pre_monsoon: "প্রাক-বর্ষা",
    lbl_peak_monsoon: "মূল বর্ষা",
    lbl_post_monsoon: "বর্ষা-পরবর্তী",
    lbl_primary_trigger: "প্রধান ঝুঁকি সৃষ্টিকারী কারণ",
    lbl_xai_factors: "ব্যাখ্যামূলক এআই (XAI) উপাদান বিশ্লেষণ",
    lbl_cascade_risk: "ভাটি অঞ্চলের ধ্বংসাবশেষের ঝুঁকি",
    lbl_recommended_action: "সুপারিশকৃত জরুরি পদক্ষেপ",
    lbl_family_alert: "সংযুক্ত পারিবারিক সুরক্ষা গ্রুপ",

    // Status Notices
    notice_simulated: "ডেমো / সিমুলেটেড ডেটা",
    notice_offline: "অফলাইন মোড সক্রিয় — ডিভাইসে সংরক্ষিত",
    voice_playing: "ভয়েস অ্যালার্ট বাজানো হচ্ছে..."
  }
};

class I18nManager {
  constructor() {
    this.currentLanguage = localStorage.getItem('nera_lang') || 'en';
    if (!TRANSLATIONS[this.currentLanguage]) {
      this.currentLanguage = 'en';
    }
  }

  getLanguage() {
    return this.currentLanguage;
  }

  setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
      this.currentLanguage = lang;
      localStorage.setItem('nera_lang', lang);
      this.translateDOM();
      window.dispatchEvent(new CustomEvent('nera:language-changed', { detail: { lang } }));
    }
  }

  t(key, lang = null) {
    const l = lang || this.currentLanguage;
    const dict = TRANSLATIONS[l] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  }

  translateDOM() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = this.t(key);
      if (val) {
        if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
          el.value = val;
        } else if (el.hasAttribute('placeholder')) {
          el.placeholder = val;
        } else if (el.getAttribute('data-i18n-html') === 'true') {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    });

    // Update document title
    document.title = this.t('app_title');
  }

  speakAlert(text, lang = null) {
    const l = lang || this.currentLanguage;
    if (!('speechSynthesis' in window)) {
      alert(`Voice Alert (${l.toUpperCase()}): ${text}`);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langLocales = {
      en: 'en-IN',
      hi: 'hi-IN',
      as: 'bn-IN',
      bn: 'bn-IN',
    };
    utterance.lang = langLocales[l] || 'en-IN';
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }
}

export const i18n = new I18nManager();
