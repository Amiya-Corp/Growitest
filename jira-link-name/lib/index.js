const axios = require('axios');
const urlRegex = /https:\/\/([a-zA-Z0-9-]+)\.atlassian\.net\/browse\/([A-Za-z0-9-]+)/; // JiraのURL形式に対応する正規表現

module.exports = (growi) => {
  const { logger } = growi;

  // Jira APIでチケットタイトルを取得する関数
  async function getJiraTicketTitle(jiraUrl) {
    const match = jiraUrl.match(urlRegex);
    if (!match) {
      logger.error(`Invalid Jira URL: ${jiraUrl}`);
      return '無効なJiraチケットURL';
    }

    const domain = match[1];  // Jiraドメイン
    const ticketId = match[2];  // チケットID

    // Jira APIのURLを作成
    const apiUrl = `https://${domain}.atlassian.net/rest/api/2/issue/${ticketId}`;

    try {
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from('YOUR_EMAIL:YOUR_API_TOKEN').toString('base64')}`,
          'Accept': 'application/json'
        }
      });
      const ticketTitle = response.data.fields.summary; // チケットのサマリーを取得
      return ticketTitle || 'タイトルが見つかりません';
    } catch (error) {
      logger.error(`Error fetching Jira ticket: ${error.message}`);
      return 'Jiraチケットの取得に失敗しました';
    }
  }

  // GROWIのプラグインとして、リンクを変換するフィルターを追加
  growi.pluginManager.addFilters('markdown-it', (mdParser) => {
    mdParser.use((md) => {
      md.core.ruler.push('jira-ticket-title', (state) => {
        state.tokens.forEach((token) => {
          if (token.type === 'link_open' && token.attrs) {
            const url = token.attrs[0][1]; // リンクURLを取得
            if (url && urlRegex.test(url)) { // JiraのURLなら
              getJiraTicketTitle(url).then((title) => {
                token.attrs[0][1] = title;  // リンクをチケットタイトルに置き換える
              });
            }
          }
        });
      });
    });
  });
};
