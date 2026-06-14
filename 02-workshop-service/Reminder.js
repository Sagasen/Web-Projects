function createReminder(
customerId,
vehicleId
){

 const sheet =
 getSheet(
 "REMINDERS"
 );

 const reminderDate =
 new Date();

 reminderDate.setDate(
 reminderDate.getDate()
 + 90
 );

 sheet.appendRow([

   "REM" +
   new Date().getTime(),

   customerId,

   vehicleId,

   reminderDate,

   "PENDING"

 ]);

}

//Kirim Reminder Harian
function sendReminders(){

 const sheet =
 getSheet(
 "REMINDERS"
 );

 const data =
 sheet.getDataRange()
 .getValues();

 const today =
 new Date();

 for(let i=1;i<data.length;i++){

   const due =
   new Date(data[i][3]);

   const status =
   data[i][4];

   if(

      due <= today

      &&

      status ==
      "PENDING"

   ){

      sendReminderMessage(
      data[i][1]
      );

      sheet
      .getRange(i+1,5)
      .setValue("SENT");

   }

 }

}

//Pesan Reminder
function sendReminderMessage(
customerId
){

 const customers =
 getSheet("CUSTOMERS")
 .getDataRange()
 .getValues();

 let hp = "";
 let nama = "";

 customers.forEach(r=>{

   if(r[0] == customerId){

      hp = r[2];
      nama = r[1];

   }

 });

 const msg =

`🔔 Pengingat Servis

Halo ${nama},

Sudah waktunya melakukan servis rutin kendaraan Anda.

Silakan hubungi bengkel untuk melakukan booking servis.

Terima kasih.
`;

 sendWhatsApp(
 hp,
 msg
 );

}
