/* ═══════════════════════════════════════════════════
   ShopFlow Dashboard — Lógica Principal (app.js)
   Sessão 2: Relógio, estrutura e eventos base
   ═══════════════════════════════════════════════════ */
 
// ── Estado global do dashboard ──────────────────────
// Objecto central que guarda os dados do dashboard.
// Vai crescer em cada sessão.
const ShopFlow = {
  versao: '2.0',

  cache: {},

  loja: {
      nome: 'ShopFlow',
      cidade: 'Porto',
      moeda: 'EUR'
  },
  dados: {
      produtos: [],         // Preenchido na Sessão 3
      categoriaActiva: 'todos',
      totalVendas: 0,       // Actualizado na Sessão 4
      totalReceita: 0,      // Actualizado na Sessão 4
      temperatura: null,    // Preenchido na Sessão 7
      humidade: null        // Preenchido na Sessão 7
  },
  ligacoes: {
      websocket: null,      // Criado na Sessão 4
      mqtt: null            // Criado na Sessão 7
  }
};



// ── Utilitários ──────────────────────────────────────

/**
* Formata um número como valor monetário em EUR
* @param {number} valor - O valor a formatar
* @returns {string} - Ex: '1.234,56 EUR'
*/
function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
  }).format(valor);
}

/**
* Formata uma data no padrão português
* @param {Date} data - O objecto Date a formatar
* @returns {string} - Ex: 'segunda-feira, 11 de março de 2026'
*/
function formatarData(data) {
  return data.toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });
}

// ── Relógio em tempo real ────────────────────────────

function actualizarRelogio() {
  const agora = new Date();

  // Formatar hora com dois dígitos (ex: 09:05:03)
  const horas   = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  const segundos = String(agora.getSeconds()).padStart(2, '0');
  const horaFormatada = `${horas}:${minutos}:${segundos}`;

  // Actualizar o elemento do relógio no HTML
  const elemRelogio = document.getElementById('relogio');
  if (elemRelogio) elemRelogio.textContent = horaFormatada;

  // Actualizar a data (só precisa de mudar uma vez por dia,
  // mas actualizamos aqui para simplificar)
  const elemData = document.getElementById('data-hoje');
  if (elemData) elemData.textContent = formatarData(agora);
}

// Iniciar o relógio: actualizar imediatamente e depois
// a cada 1000 milissegundos (1 segundo)
actualizarRelogio();
setInterval(actualizarRelogio, 1000);

// ── Painel de Stock ───────────────────────────────────

/**
* Carrega os produtos a partir do ficheiro JSON.
* Usa async/await para esperar pela resposta sem bloquear a página.
*/
async function carregarProdutos() {
  const lista = document.getElementById('lista-produtos');
  lista.innerHTML = '<p class="sf-placeholder">A carregar produtos...</p>';

  try {
      const resposta = await fetch('data/produtos.json');

      // Verificar se o pedido foi bem sucedido (código HTTP 200)
      if (!resposta.ok) {
          throw new Error(`Erro HTTP: ${resposta.status}`);
      }

      const dados = await resposta.json();
      ShopFlow.dados.produtos = dados.produtos;

      console.log(`Carregados ${dados.produtos.length} produtos`);
      renderizarProdutos(ShopFlow.dados.produtos);

  } catch (erro) {
      console.error('Erro ao carregar produtos:', erro);
      lista.innerHTML = `<p class="sf-placeholder">
          Erro ao carregar produtos. Verifique a consola.</p>`;
  }
}

/**
* Filtra os produtos pela categoria seleccionada.
* @param {string} categoria - 'todos' ou o nome da categoria
* @returns {Array} - Array de produtos filtrados
*/
function filtrarProdutos(categoria) {
  if (categoria === 'todos') {
      return ShopFlow.dados.produtos;
  }
  return ShopFlow.dados.produtos.filter(p => p.categoria === categoria);
}

/**
* Determina o estado do stock de um produto.
* @param {number} stock - Quantidade em stock
* @returns {Object} - { classe, texto } para usar no HTML
*/
function estadoStock(stock) {
  if (stock === 0)  return { classe: 'esgotado', texto: 'Esgotado' };
  if (stock <= 5)   return { classe: 'baixo',    texto: `Apenas ${stock}` };
  return               { classe: 'ok',       texto: `${stock} unid.` };
}


/**
* Renderiza os cartões de produto no DOM.
* @param {Array} produtos - Array de objectos produto
*/
function renderizarProdutos(produtos) {
  const lista = document.getElementById('lista-produtos');
  const badge = document.getElementById('badge-stock');

  // Actualizar o contador no cabeçalho do painel
  badge.textContent = `${produtos.length} produto${produtos.length !== 1 ? 's' : ''}`;

  // Caso não haja produtos na categoria
  if (produtos.length === 0) {
      lista.innerHTML = `<div class="sf-sem-produtos">
          Nenhum produto na categoria "${ShopFlow.dados.categoriaActiva}".
      </div>`;
      return;
  }

  // Construir o HTML de todos os cartões de uma vez
  const html = produtos.map(produto => {
      const estado = estadoStock(produto.stock);
      const classeCartao = produto.stock === 0 ? 'sf-produto-cartao sf-produto-cartao--esgotado'
                                               : 'sf-produto-cartao';
      const precoFormatado = formatarMoeda(produto.preco);

      return `
          <div class="${classeCartao}" data-id="${produto.id}">
              <div class="sf-produto-info">
                  <div class="sf-produto-nome">${produto.nome}</div>
                  <div class="sf-produto-categoria">${produto.categoria}</div>
              </div>
              <div class="sf-produto-direita">
                  <span class="sf-produto-preco">${precoFormatado}</span>
                  <span class="sf-produto-stock sf-produto-stock--${estado.classe}">
                      ${estado.texto}
                  </span>
              </div>
          </div>
      `;
  }).join('');

  lista.innerHTML = html;
}



// ── Gestão de eventos — Filtros de stock ─────────────
// Os botões de filtro são criados aqui.
// A lógica de filtro real será adicionada na Sessão 3.

// ── Gestão de eventos — Filtros de stock ─────────────
document.querySelectorAll('.sf-btn').forEach(botao => {
  botao.addEventListener('click', (evento) => {
      const categoria = evento.target.dataset.categoria;

      // Actualizar estado visual dos botões
      document.querySelectorAll('.sf-btn').forEach(b => {
          b.classList.remove('sf-btn--activo');
      });
      evento.target.classList.add('sf-btn--activo');

      // Guardar categoria activa no estado global
      ShopFlow.dados.categoriaActiva = categoria;

      // Filtrar e renderizar os produtos
      const produtosFiltrados = filtrarProdutos(categoria);
      renderizarProdutos(produtosFiltrados);
  });
});

// ── Inicialização ─────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  console.log(`ShopFlow Dashboard v${ShopFlow.versao} iniciado`);
  console.log('Sessão 2: Estrutura base criada com sucesso');
  console.log('Próximos passos:');
  console.log('  Sessão 3: Carregar produtos a partir de produtos.json');
  console.log('  Sessão 4: Ligar WebSocket para vendas em tempo real');

  // Activar o primeiro botão de filtro
  const primeiroBotao = document.querySelector('.sf-btn');
  if (primeiroBotao) primeiroBotao.classList.add('sf-btn--activo');


  // NOVO (Sessão 4): Ligar ao servidor WebSocket
  ShopFlow.reconectar = true;  // Permitir reconexão automática
  ligarWebSocket();

  // NOVO — Sessão 5: APIs externas
  actualizarPainelMeteo();
  actualizarPainelCambios();

  // Actualização periódica automática
  setInterval(actualizarPainelMeteo,   CONFIG.INTERVALO_METEO);
  setInterval(actualizarPainelCambios, CONFIG.INTERVALO_CAMBIOS);
});

// ── Painel de Vendas em Tempo Real ───────────────────
 
/**
 * Actualiza os contadores de encomendas e receita.
 * @param {number} totalVendido - Valor da venda a adicionar
 */
 function actualizarContadores(totalVendido) {
  ShopFlow.dados.totalVendas  += 1;
  ShopFlow.dados.totalReceita += totalVendido;

  const elemVendas  = document.getElementById('total-vendas');
  const elemReceita = document.getElementById('total-receita');

  if (elemVendas)  elemVendas.textContent  = ShopFlow.dados.totalVendas;
  if (elemReceita) elemReceita.textContent  = formatarMoeda(ShopFlow.dados.totalReceita);
}

/**
* Adiciona uma nova venda ao feed, no topo da lista.
* Mantém no máximo 20 itens visíveis.
* @param {Object} venda - Dados da venda recebidos do servidor
*/
function adicionarAoFeed(venda) {
  const feed = document.getElementById('feed-vendas');

  // Remover o placeholder se ainda existir
  const placeholder = feed.querySelector('.sf-placeholder');
  if (placeholder) placeholder.remove();

  // Criar o elemento da venda
  const item = document.createElement('div');
  item.className = 'sf-feed-item';
  item.innerHTML = `
      <span class="sf-feed-produto">${venda.produto}</span>
      <span class="sf-feed-local">${venda.localidade} &bull; ${venda.hora}</span>
      <span class="sf-feed-valor">${formatarMoeda(venda.total)}</span>
  `;

  // Inserir no topo (antes do primeiro filho)
  feed.insertBefore(item, feed.firstChild);

  // Limitar a 20 itens para não sobrecarregar o DOM
  const itens = feed.querySelectorAll('.sf-feed-item');
  if (itens.length > 20) {
      itens[itens.length - 1].remove();
  }

  // Animar a barra de actividade WebSocket
  const barra = document.getElementById('ws-barra');
  if (barra) {
      barra.classList.remove('sf-ws-barra--activa');
      void barra.offsetWidth; // Forçar re-render para reiniciar animação
      barra.classList.add('sf-ws-barra--activa');
  }
}

/**
* Actualiza o indicador de estado da ligação WebSocket.
* @param {'online'|'offline'} estado
*/
function actualizarIndicadorWS(estado) {
  const indicador = document.getElementById('indicador-ws');
  if (!indicador) return;

  if (estado === 'online') {
      indicador.textContent = 'Online';
      indicador.className   = 'sf-indicador sf-indicador--online';
  } else {
      indicador.textContent = 'Desligado';
      indicador.className   = 'sf-indicador sf-indicador--offline';
  }
}

/**
 * Estabelece e gere a ligação WebSocket ao servidor ShopFlow.
 * Implementa reconexão automática com backoff exponencial.
 */
 function ligarWebSocket() {
  // IMPORTANTE: Substituir pelo URL do vosso serviço no Render
  const URL_SERVIDOR = 'wss://shopflow-servidor.onrender.com';

  console.log('A ligar ao servidor WebSocket...');

  try {
      ShopFlow.ligacoes.websocket = new WebSocket(URL_SERVIDOR);
  } catch (e) {
      console.error('Não foi possível criar WebSocket:', e);
      return;
  }

  const ws = ShopFlow.ligacoes.websocket;

  // ── Ligação estabelecida ──
  ws.onopen = () => {
      console.log('WebSocket ligado ao servidor ShopFlow');
      actualizarIndicadorWS('online');
      ShopFlow.reconexoes = 0; // Resetar contador de reconexões
  };

  // ── Mensagem recebida do servidor ──
  ws.onmessage = (evento) => {
      try {
          const mensagem = JSON.parse(evento.data);

          if (mensagem.tipo === 'venda') {
              // Processar venda: actualizar contadores e feed
              actualizarContadores(mensagem.total);
              adicionarAoFeed(mensagem);

          } else if (mensagem.tipo === 'ligado') {
              console.log('Servidor:', mensagem.mensagem);
          }

      } catch (e) {
          console.error('Erro ao processar mensagem:', e);
      }
  };

  // ── Erro na ligação ──
  ws.onerror = (erro) => {
      console.error('Erro WebSocket — verifique se o servidor está activo');
      actualizarIndicadorWS('offline');
  };

  // ── Ligação fechada — tentar reconectar ──
  ws.onclose = (evento) => {
      console.log(`WebSocket fechado (código: ${evento.code})`);
      actualizarIndicadorWS('offline');

      // Reconexão automática após 5 segundos
      if (!ShopFlow.reconectar) return; // Não reconectar se foi fechado intencionalmente
      console.log('A reconectar em 5 segundos...');
      setTimeout(ligarWebSocket, 5000);
  };
}

// ── Painel de Meteorologia ───────────────────────────
 
// Inicializar o objecto de cache no ShopFlow
// (adicionar junto às outras propriedades do ShopFlow)
// ShopFlow.cache = {};  <- já adicionado na inicialização abaixo
 
/**
 * Converte o código de ícone da OpenWeatherMap num emoji.
 */
function iconeMeteoEmoji(iconCode) {
    const mapa = {
        '01d':'☀️', '01n':'🌙',  '02d':'⛅', '02n':'☁️',
        '03d':'☁️', '03n':'☁️',  '04d':'☁️', '04n':'☁️',
        '09d':'🌧️','09n':'🌧️', '10d':'🌦️','10n':'🌧️',
        '11d':'⛈️','11n':'⛈️', '13d':'❄️', '13n':'❄️',
        '50d':'🌫️','50n':'🌫️',
    };
    return mapa[iconCode] || '🌡️';
}
 
/**
 * Pede dados à OpenWeatherMap com cache de 10 minutos.
 */
async function pedirDadosMeteo() {
    const agora = Date.now();
    if (ShopFlow.cache.meteo &&
        (agora - ShopFlow.cache.meteoTimestamp) < CONFIG.INTERVALO_METEO) {
        return ShopFlow.cache.meteo;
    }
    const url = `https://api.openweathermap.org/data/2.5/weather` +
                `?q=${CONFIG.CIDADE},${CONFIG.PAIS}` +
                `&appid=${CONFIG.OPENWEATHER_KEY}` +
                `&units=metric&lang=pt`;
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`OpenWeatherMap: erro ${resposta.status}`);
    const dados = await resposta.json();
    ShopFlow.cache.meteo = dados;
    ShopFlow.cache.meteoTimestamp = agora;
    return dados;
}
 
/**
 * Actualiza o painel de meteorologia no DOM.
 */
async function actualizarPainelMeteo() {
    const painel = document.getElementById('meteo-conteudo');
    if (!painel) return;
    try {
        const d = await pedirDadosMeteo();
        const temp      = Math.round(d.main.temp);
        const sensacao  = Math.round(d.main.feels_like);
        const humidade  = d.main.humidity;
        const vento     = (d.wind.speed * 3.6).toFixed(1);
        const descricao = d.weather[0].description;
        const icone     = iconeMeteoEmoji(d.weather[0].icon);
        const hora      = new Date(d.dt * 1000)
                              .toLocaleTimeString('pt-PT',
                                  { hour: '2-digit', minute: '2-digit' });
        painel.innerHTML = `
            <div class="sf-meteo-principal">
                <span class="sf-meteo-icone">${icone}</span>
                <div>
                    <div class="sf-meteo-temp">${temp}°C</div>
                    <div class="sf-meteo-descricao">${descricao}</div>
                </div>
            </div>
            <div class="sf-meteo-detalhes">
                <div class="sf-meteo-detalhe">
                    <span>Sensação</span><span>${sensacao}°C</span>
                </div>
                <div class="sf-meteo-detalhe">
                    <span>Humidade</span><span>${humidade}%</span>
                </div>
                <div class="sf-meteo-detalhe">
                    <span>Vento</span><span>${vento} km/h</span>
                </div>
                <div class="sf-meteo-detalhe">
                    <span>Pressão</span><span>${d.main.pressure} hPa</span>
                </div>
            </div>
            <div class="sf-meteo-actualizado">Actualizado às ${hora}</div>`
    } catch (erro) {
        console.error('Erro meteorologia:', erro);
        painel.innerHTML = `<div class="sf-api-erro">
            Não foi possível obter dados meteorológicos.<br>
            Verifique a chave API em config.js.</div>`;
    }
}

 
// ── Painel de Câmbios ────────────────────────────────
 
const MOEDAS_CAMBIO = [
    { codigo: 'USD', nome: 'Dólar americano'  },
    { codigo: 'GBP', nome: 'Libra esterlina'  },
    { codigo: 'CHF', nome: 'Franco suíço'     },
];
 
async function pedirDadosCambios() {
    const agora = Date.now();
    if (ShopFlow.cache.cambios &&
        (agora - ShopFlow.cache.cambiosTimestamp) < CONFIG.INTERVALO_CAMBIOS) {
        return ShopFlow.cache.cambios;
    }
    const resposta = await fetch(
        `https://open.er-api.com/v6/latest/${CONFIG.MOEDA}`);
    if (!resposta.ok) throw new Error(`ExchangeRate: ${resposta.status}`);
    const dados = await resposta.json();
    if (dados.result !== 'success') throw new Error('Resposta inválida');
    ShopFlow.cache.cambios = dados;
    ShopFlow.cache.cambiosTimestamp = agora;
    return dados;
}
 
async function actualizarPainelCambios() {
    const painel = document.getElementById('cambios-conteudo');
    if (!painel) return;
    try {
        const dados = await pedirDadosCambios();
        const rates = dados.rates;
        const ultimaAct = new Date(dados.time_last_update_utc)
            .toLocaleDateString('pt-PT', {
                day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit'
            });
        const itensHtml = MOEDAS_CAMBIO.map(moeda => {
            const taxa = rates[moeda.codigo];
            if (!taxa) return '';
            return `
                <div class="sf-cambio-item">
                    <div>
                        <div class="sf-cambio-par">
                            ${CONFIG.MOEDA} &rarr; ${moeda.codigo}
                        </div>
                        <div class="sf-cambio-base">${moeda.nome}</div>
                    </div>
                    <div class="sf-cambio-valor">${taxa.toFixed(4)}</div>
                </div>`;
        }).join('');
        painel.innerHTML = `
            <div class="sf-cambios-lista">${itensHtml}</div>
            <div class="sf-cambios-actualizado">
                Actualizado: ${ultimaAct}</div>`;
    } catch (erro) {
        console.error('Erro câmbios:', erro);
        painel.innerHTML =
            '<div class="sf-api-erro">Não foi possível obter dados de câmbio.</div>';
    }
}

