function doGet(e) {
  const page = e && e.parameter && e.parameter.page
    ? e.parameter.page
    : "login";

  const props = PropertiesService.getUserProperties().getProperties();
  const role = props.ROLE;

  if (page === "admin") {
    if (role !== "ADMIN") {
      return HtmlService.createTemplateFromFile("Login")
        .evaluate()
        .setTitle("Workshop Service")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    return HtmlService.createTemplateFromFile("AdminDashboard")
      .evaluate()
      .setTitle("Admin Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (page === "customer") {
    if (role !== "CUSTOMER") {
      return HtmlService.createTemplateFromFile("Login")
        .evaluate()
        .setTitle("Workshop Service")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    return HtmlService.createTemplateFromFile("CustomerDashboard")
      .evaluate()
      .setTitle("Customer Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createTemplateFromFile("Login")
    .evaluate()
    .setTitle("Workshop Service")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}

function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}
