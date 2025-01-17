console.log("Popup loaded!");

document.getElementById("saveNote").addEventListener("click", () => {
  const note = document.getElementById("note").value;
  console.log("Saved note:", note);
  // TODO: Save note logic
});
