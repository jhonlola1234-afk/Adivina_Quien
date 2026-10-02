package com.adivinaquien.juegos.game;

import static org.junit.jupiter.api.Assertions.*;
import java.net.URI;
import java.net.http.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GameHttpTests {
    @Value("${local.server.port}") int port;
    @Autowired ObjectMapper mapper;
    private final HttpClient client = HttpClient.newHttpClient();

    HttpResponse<String> send(String method, String path, String token, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
            .header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void privateSessionAndCompleteGameOverHttp() throws Exception {
        var created = send("POST", "/rooms", null, "{\"name\":\"Ana\",\"category\":\"paises\"}");
        assertEquals(201, created.statusCode());
        JsonNode host = mapper.readTree(created.body());
        String code = host.at("/session/room/code").asText();
        String hostToken = host.get("token").asText();
        String hostId = host.at("/session/self/id").asText();
        JsonNode guest = mapper.readTree(send("POST", "/rooms/" + code + "/join", null, "{\"name\":\"Luis\"}").body());
        String guestToken = guest.get("token").asText();
        String guestId = guest.at("/session/self/id").asText();
        String base = "/rooms/" + code;
        assertEquals(401, send("GET", base + "/session", null, null).statusCode());
        assertEquals(401, send("GET", base + "/session", "invalid", null).statusCode());
        assertEquals(409, send("POST", base + "/start", guestToken, "{}").statusCode());
        assertEquals(200, send("PUT", base + "/secret", hostToken, "{\"secret\":\"paises-0\"}").statusCode());
        assertEquals(200, send("PUT", base + "/secret", guestToken, "{\"secret\":\"paises-1\"}").statusCode());
        var restored = send("GET", base + "/session", hostToken, null);
        assertEquals("no-store", restored.headers().firstValue("Cache-Control").orElseThrow());
        JsonNode privateState = mapper.readTree(restored.body());
        assertEquals("paises-0", privateState.at("/self/secret").asText());
        assertFalse(privateState.get("room").toString().contains("paises-1"));
        assertFalse(privateState.get("room").toString().contains("tokenHash"));
        JsonNode started = mapper.readTree(send("POST", base + "/start", hostToken, "{}").body());
        String guess = "{\"targetId\":\"" + guestId + "\",\"secret\":\"paises-1\",\"revision\":" + started.at("/room/revision").asLong() + "}";
        var result = send("POST", base + "/accuse", hostToken, guess);
        assertEquals(200, result.statusCode());
        assertEquals("finished", mapper.readTree(result.body()).at("/room/phase").asText());
        JsonNode guestFinal = mapper.readTree(send("GET", base + "/session", guestToken, null).body());
        assertEquals(hostId, guestFinal.at("/room/winnerId").asText());
        assertEquals(409, send("POST", base + "/accuse", hostToken, guess).statusCode());
        assertEquals(200, send("POST", base + "/rematch", hostToken, "{}").statusCode());
        assertEquals(204, send("POST", base + "/leave", guestToken, "{}").statusCode());
        assertEquals(401, send("GET", base + "/session", guestToken, null).statusCode());
        assertEquals(204, send("POST", base + "/leave", hostToken, "{}").statusCode());
    }

    @Test
    void validatesInputCatalogAndCors() throws Exception {
        assertEquals(400, send("POST", "/rooms", null, "{\"name\":\"\",\"category\":\"paises\"}").statusCode());
        assertEquals(409, send("POST", "/rooms", null, "{\"name\":\"Ana\",\"category\":\"unknown\"}").statusCode());
        JsonNode categories = mapper.readTree(send("GET", "/categories", null, null).body());
        assertEquals(5, categories.size());
        for (JsonNode category : categories) assertEquals(20, category.get("characters").size());
        var preflight = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/rooms"))
            .header("Origin", "http://localhost:5173").header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "content-type,authorization").method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build();
        var allowed = client.send(preflight, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, allowed.statusCode());
        assertEquals("http://localhost:5173", allowed.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
        var rejected = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/categories"))
            .header("Origin", "https://unknown.example").GET().build();
        assertEquals(403, client.send(rejected, HttpResponse.BodyHandlers.ofString()).statusCode());
    }
}