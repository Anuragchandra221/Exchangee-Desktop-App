if(localStorage.getItem("username")&&localStorage.getItem('password')){
    window.location.href = "./index.html"
}else{
    document.getElementById("submitButton").addEventListener('click',()=>{
        const username = document.getElementById("username").value
        const password = document.getElementById("password").value 
        if(username && password){
            localStorage.setItem("username", username)
            localStorage.setItem("password", password)
            console.log("success")
            window.location.href = './index.html';
        }
    })
}