package com.pw.nexusnav;

import com.pw.nexusnav.config.NexusNavProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(NexusNavProperties.class)
public class NexusNavApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexusNavApplication.class, args);
    }
}
