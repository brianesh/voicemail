function getEmails() {
    let emailList = document.querySelectorAll(".zA .y6 span");
    return Array.from(emailList).slice(0, 5).map(e => e.textContent);
  }
  