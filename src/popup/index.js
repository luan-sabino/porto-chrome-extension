const MESSAGE_200 = ""
const MESSAGE_401 = "Não autorizado. Verifique o token e tente novamente. Se persistir entre com contato com o responsavel."
const MESSAGE_500 = "Erro interno do RD Station. Aguarde e tente novamente."
const MESSAGE_UNKNOW = "Erro inesperado, entre em contato com o responsável."

window.addEventListener('load', () => {
  let accessTokenInput = document.getElementById('tokenAuth')

  chrome.storage.local.get("token", function (data) {
    if (data) accessTokenInput.value = data.token
  });
})

const setAccessToken = (accessToken) => {
  chrome.storage.local.set({ 'token': accessToken })
}

const getCurrentTab = async () => {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0] || tabs[0].url.startsWith('chrome://')) {
        resolve(null)
      }

      resolve(tabs[0].id)
    })
  })
}

document.querySelector('#button').addEventListener('click', async () => {

  let loadingDiv = document.getElementById('loading')
  let accessTokenInput = document.getElementById('tokenAuth')
  let messageSpan = document.getElementById('message')
  let newLeads = 0
  let index = 0
  const accessToken = accessTokenInput.value

  if (!accessToken) {
    messageSpan.style = "color: red;"
    messageSpan.textContent = "Insira o token de autenticação do RD Station, ou exporte a tabela com XLSX."
  } else {
    loadingDiv.style = "display: flex;"

    setAccessToken(accessToken)

    chrome.storage.local.get(['fc_listar_oportunidade_por_produto'], async ({ fc_listar_oportunidade_por_produto }) => {
      const values = JSON.parse(fc_listar_oportunidade_por_produto);

      for (const contact of values) {
        index++;
        const optionsGet = { method: 'GET', headers: { accept: 'application/json' } };

        await fetch(`https://crm.rdstation.com/api/v1/contacts?token=${accessToken}&email=${contact.ClienteEmail}`, optionsGet)
          .then(async response => {
            if (response.status === 401) { messageSpan.textContent = MESSAGE_401; newLeads = -1 }
            else if (response.status === 500) { messageSpan.textContent = MESSAGE_500; newLeads = -1 }
            else if (response.status === 200) {
              const responseParsed = await response.json()
              console.log(responseParsed)
              if (responseParsed.total === 0) {
                const options = {
                  method: 'POST',
                  headers: { accept: 'application/json', 'content-type': 'application/json' },
                  body: JSON.stringify({
                    contact: {
                      deal_ids: [contact.OportunidadeId],
                      emails: [{ email: contact.ClienteEmail }],
                      phones: [{ phone: contact.Telefone, type: "Celular" }],
                      name: contact.ClienteNome,
                    }
                  })
                };

                await fetch(`https://crm.rdstation.com/api/v1/contacts?token=${accessToken}`, options)
                  .then(response => {
                    if (response.status === 401) { messageSpan.textContent = MESSAGE_401; newLeads = -1 }
                    else if (response.status === 500) { messageSpan.textContent = MESSAGE_500; newLeads = -1 }
                    else if (response.status === 200) { newLeads++ }
                    else { messageSpan.textContent = MESSAGE_UNKNOW; newLeads = -1 }
                  })
                  .catch(err => console.log(err));
              }
            } else { messageSpan.textContent = MESSAGE_UNKNOW; newLeads = -1 }
          })
          .catch(err => { console.log(err); messageSpan.textContent = "Entre em contato com o responsavel" });
      }



      if (index === values.length && newLeads !== -1) {
        loadingDiv.style = "display: none;"
        messageSpan.style = "color: green;"
        if (newLeads === 1) {
          messageSpan.textContent = `Foi adicionado 1 novo lead ao RD Station.`
        } else if (newLeads > 1) messageSpan.textContent = `Foram adicionados ${newLeads} novos leads ao RD Station`
        else if (newLeads === 0) messageSpan.textContent = "Nenhum novo lead foi adicionado. Provavelmente ja estão no RD Station."
      } else if (index === values.length && newLeads == -1) {
        messageSpan.style = "color: red;"
        loadingDiv.style = "display: none;"
      } else {
        loadingDiv.style = "display: none;"
        messageSpan.style = "color: red;"
        messageSpan.textContent = "Entre em contato com o responsavel"
      }
    })

  }
})

document.querySelector('#button2').addEventListener('click', async () => {
  chrome.storage.local.get(['fc_listar_oportunidade_por_produto'], async ({ fc_listar_oportunidade_por_produto }) => {
    const values = JSON.parse(fc_listar_oportunidade_por_produto);

    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(values);
    XLSX.utils.book_append_sheet(workbook, ws, "Leads");
    XLSX.writeFile(workbook, 'PortoLeads.xlsx')
  })

})


// 648031ff5ed32c000dbf4af1 meu token