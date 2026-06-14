//Generate PDF
function createInvoicePDF(
serviceId
){

 const invoice =
 generateInvoiceText(
 serviceId
 );

 const file =
 DriveApp
 .createFile(

 "Invoice_"+serviceId+".txt",

 invoice

 );

 return file.getUrl();

}

//QR Code Invoice
function getInvoiceQR(
serviceId
){

 const url =

 ScriptApp
 .getService()
 .getUrl()

 +

 "?page=invoice&id="

 +

 serviceId;

 return

 "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data="

 +

 encodeURIComponent(url);

}
