package com.pw.nexusnav.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    @GetMapping("/{path:^(?!api$)[^.]*}")
    public String forward() {
        return "forward:/index.html";
    }
}
