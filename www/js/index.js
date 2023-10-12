var socket = io();
var channal = null;
var channal_id = null;
var messages = document.getElementById("messages-ul");
var form = document.getElementById("send-container");
var channals = document.querySelector(".public-chatt-list");
var input = document.getElementById("message-input");
form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (input.value) {
    socket.emit(
      "chat message",
      JSON.stringify({
        channal_id: channal_id,
        channal: channal,
        message: input.value,
        username: username,
        userid: userid,
        date: new Date().toGMTString(),
      })
    );
    input.value = "";
  }
});

function addMessage(msg, item = null, edit = false) {
  item = item ? item : document.createElement("li");

  item.style.padding = "10px";
  item.style.marginLeft = "20px";
  item.style.marginBottom = "20px";
  item.setAttribute("id", "message-" + msg.id);

  if (msg.username === username || msg.user_name === username) {
    item.style.float = "right";
    item.style.textAlign = "right";
    item.style.backgroundColor = "#727bfe";
    item.style.width = "fit-content";
    item.style.height = "fit-content";
    item.style.marginTop = "20px";
    item.style.marginBottom = "20px";
    item.style.color = "#FFF";
    item.textContent = msg.deleted_at
      ? "Meddelande raderat"
      : msg.message + ": " + (msg.username ? msg.username : msg.user_name);
    item.innerHTML += msg.deleted_at
      ? ""
      : " </br> <span  style='color: #fff; font-size:13px;; '> " +
        (msg.date ? msg.date : msg.created_at) +
        "  </span>" +
        (msg.edited_at
          ? "</br> <span style='color: #fff;  font-size: 13px;'>Meddelandet ändrades:  " +
            msg.edited_at +
            "  </span>"
          : "") +
        (guest
          ? ""
          : `<a href='#' style='font-size: 13px;' onclick='_edit(this, ${msg.id})'> <i class="fa-regular fa-pen-to-square"></i>Redigera</a> | <a href='#' style="font-size: 13px;" onclick='_delete(this,${msg.id})'> <i class="fa-solid fa-trash-can"></i> Radera</a>`);
  } else {
    item.style.color = "black";
    item.textContent = msg.deleted_at
      ? "Meddelande raderat"
      : (msg.username ? msg.username : msg.user_name) + ": " + msg.message;

    item.innerHTML += !msg.deleted_at
      ? " </br> <span style='color: #aaa'>[ " +
        (msg.date ? msg.date : msg.created_at) +
        " ] </span>"
      : "";
  }
  if (!edit) {
    messages.appendChild(item);
  }
  window.scrollTo(0, document.body.scrollHeight);
}
socket.on("chat message", function (msg) {
  msg = JSON.parse(msg);
  if (channal_id != msg.channal_id) return;
  addMessage(msg);
});
socket.on("edit message", function (msg) {
  msg = JSON.parse(msg);
  if (channal_id != msg.channal_id) return;
  addMessage(msg, $(`#message-${msg.id}`)[0], true);
});
socket.on("delete message", function (msg) {
  msg = JSON.parse(msg);
  if (channal_id != msg.channal_id) return;
  $(`#message-${msg.message_id}`).text("").html("Message deleted");
});

socket.on("new channal", function (msg) {
  msg = JSON.parse(msg);
  channals.innerHTML += `<button
  onclick="setChannal('${msg.channal_name}')"
  class="open-public-and-private-btn"
  style="border-bottom:none;"
>
  <label class="profile-picture"><i
      class="fa-solid fa-shuffle"
    ></i></label>
  ${msg.channal_name}
</button>`;
  window.scrollTo(0, document.body.scrollHeight);
});
socket.on("all" + username + "" + userid, function (_msg) {
  let msgs = JSON.parse(_msg);
  msgs.map((msg) => {
    addMessage(msg);
  });

  window.scrollTo(0, document.body.scrollHeight);
});

function setChannal(_channal_id, _channal) {
  channal = _channal;
  channal_id = _channal_id;
  messages.innerHTML = "";
  socket.emit(
    "get all channal messages",
    JSON.stringify({
      channal_id: channal_id,
      listen_id: username + "" + userid,
    })
  );
}

// En funktion som visar och gömmer skapa kanal fältet
function toggle() {
  var x = document.getElementById("create-channal");
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
    x.style.display = "none";
  }
}

// En funktion som skapar en ny kanal och gömmer "skapa kanal" fältet
function create() {
  let name = document.getElementById("channal-name").value;
  let private = document.getElementById("channal-private").checked;
  socket.emit(
    "new channal",
    JSON.stringify({ channal_name: name, private: private })
  );
  setChannal(name);
  toggle();
}

function addState() {
  let stateObj = { id: "100" };
  window.history.pushState(stateObj, "home", "/");

}

function _edit(el, message_id) {
  $.confirm({
    title: "Ändra meddelande",
    theme: "supervan",
    content:
      "" +
      '<form action="" class="">' +
      '<div class="form-group">' +
      "<label>Skriv in ett nytt medelande  ㅤ</label>" +
      '<input type="text" placeholder="Ditt meddelande" class="message form-control" required />' +
      "</div>" +
      "</form>",
    buttons: {
      formSubmit: {
        text: "Submit",
        btnClass: "btn-blue",
        action: function () {
          var message = this.$content.find(".message").val();
          if (!message) {
            $.alert({
              title: "Skriv ett giltigt meddelande",
              content: "",
              theme: "supervan",
            });
            return false;
          }
          $.alert({
            title: "Ditt meddelande är " + message,
            content: "",
            theme: "supervan",
          });
          socket.emit(
            "edit message",
            JSON.stringify({
              message: message,
              message_id: message_id,
              channal_id: channal_id,
            })
          );
        },
      },
      cancel: function () {
     
      },
    },
    onContentReady: function () {
  
      var jc = this;
      this.$content.find("form").on("submit", function (e) {
    
        e.preventDefault();
        jc.$$formSubmit.trigger("click"); 
      });
    },
  });
}

function _delete(el, message_id) {
  $.confirm({
    title: "Bekräfta borttagning",
    theme: "supervan",
    content:
      "Är du säker på att du vill ta bort meddelandet? <br> <br> <b>Detta går inte att ångra</b>",
    buttons: {
      Yes: function () {
        socket.emit(
          "delete message",
          JSON.stringify({ channal_id: channal_id, message_id: message_id })
        );
        $(el).parent().html("Message deleted");
        $.alert({ title: "Meddelandet är borttaget", content: "", theme: "supervan" });
      },
      No: function () {
        $.alert({ title: "Avbruten återgärd", content: "", theme: "supervan" });
      },
    },
  });
}
