package com.adivinaquien.juegos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.adivinaquien.juegos", "controller", "service", "config"})
@EntityScan(basePackages = {"com.adivinaquien.juegos", "model"})
@EnableJpaRepositories(basePackages = {"com.adivinaquien.juegos", "repository"})
public class JuegosApplication {

	public static void main(String[] args) {
		SpringApplication.run(JuegosApplication.class, args);
	}

}
